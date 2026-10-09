import request from 'supertest';
import { app } from '../app';
import { UserModel } from '../models/user.model';
import { PatientModel } from '../models/patient.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { DiagnosticReportModel } from '../models/diagnosticReport.model';
import { ConditionModel } from '../models/condition.model';
import { DocumentModel } from '../models/document.model';
import bcrypt from 'bcryptjs';

describe('Phase 6: ABDM / FHIR R4 Bundle Exporter & Longitudinal Analytics Test Suite', () => {
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  const testUsers = [
    {
      _id: '670529d10e012a938c401002',
      email: 'patient1@example.com',
      passwordHash,
      role: 'patient',
      patientId: 'PT-1001',
      name: 'Ramesh Kumar',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, passwordHash),
    },
    {
      _id: '670529d10e012a938c401003',
      email: 'patient2@example.com',
      passwordHash,
      role: 'patient',
      patientId: 'PT-1002',
      name: 'Priya Sundaram',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, passwordHash),
    },
  ];

  const testPatient = {
    _id: '670529d10e012a938c402001',
    patientId: 'PT-1001',
    name: 'Ramesh Kumar',
    dob: new Date('1984-06-15'),
    gender: 'male',
    bloodGroup: 'B+',
    phone: '+91-9876543210',
    abhaId: '91-8472-1923-0192',
    abhaStatus: 'verified',
    lastSync: new Date(),
  };

  const testObservations = [
    {
      _id: '670529d10e012a938c405001',
      patientId: 'PT-1001',
      documentId: 'DOC-1001',
      code: 'Fasting Blood Sugar',
      value: 134,
      unit: 'mg/dL',
      referenceLow: 70,
      referenceHigh: 100,
      interpretation: 'HIGH',
      effectiveDateTime: new Date('2026-02-10'),
      issued: new Date('2026-02-10'),
    },
    {
      _id: '670529d10e012a938c405002',
      patientId: 'PT-1001',
      documentId: 'DOC-1002',
      code: 'Fasting Blood Sugar',
      value: 118,
      unit: 'mg/dL',
      referenceLow: 70,
      referenceHigh: 100,
      interpretation: 'HIGH',
      effectiveDateTime: new Date('2026-03-12'),
      issued: new Date('2026-03-12'),
    },
    {
      _id: '670529d10e012a938c405003',
      patientId: 'PT-1001',
      documentId: 'DOC-1003',
      code: 'Serum Creatinine',
      value: 0.9,
      unit: 'mg/dL',
      referenceLow: 0.6,
      referenceHigh: 1.2,
      interpretation: 'NORMAL',
      effectiveDateTime: new Date('2026-03-12'),
      issued: new Date('2026-03-12'),
    },
  ];

  const testMedications = [
    {
      _id: '670529d10e012a938c406001',
      patientId: 'PT-1001',
      documentId: 'DOC-1001',
      medicationName: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      duration: '30 days',
      instructions: 'Take after meals',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-03-12'),
      status: 'active',
      confidence: 'high',
    },
  ];

  const testReports = [
    {
      _id: '670529d10e012a938c407001',
      patientId: 'PT-1001',
      documentId: 'DOC-1001',
      code: 'Comprehensive Metabolic Panel',
      status: 'final',
      effectiveDateTime: new Date('2026-02-10'),
      conclusion: 'Elevated fasting glucose indicated.',
    },
  ];

  const testConditions = [
    {
      _id: '670529d10e012a938c408001',
      patientId: 'PT-1001',
      code: 'Type 2 Diabetes Mellitus',
      clinicalStatus: 'active',
      recordedDate: new Date('2026-02-10'),
      note: 'Monitored with dietary changes and oral hypoglycemic agent.',
    },
  ];

  const testDocuments = [
    {
      _id: '670529d10e012a938c403001',
      documentId: 'DOC-1001',
      patientId: 'PT-1001',
      fileName: 'blood_report_feb.pdf',
      fileType: 'application/pdf',
      storageRef: 'storage-ref-1',
      reportDate: '2026-02-10',
      documentType: 'lab_report',
      processingStatus: 'Completed',
      aiSummary: 'Fasting glucose was high (134 mg/dL).',
      abnormalFindings: [],
      medicines: [],
      uploadedAt: new Date('2026-02-10'),
    },
    {
      _id: '670529d10e012a938c403002',
      documentId: 'DOC-1002',
      patientId: 'PT-1001',
      fileName: 'blood_report_mar.pdf',
      fileType: 'application/pdf',
      storageRef: 'storage-ref-2',
      reportDate: '2026-03-12',
      documentType: 'lab_report',
      processingStatus: 'Completed',
      aiSummary: 'Fasting glucose showed slight reduction to 118 mg/dL.',
      abnormalFindings: [],
      medicines: [],
      uploadedAt: new Date('2026-03-12'),
    },
  ];

  let patient1Cookie: string;
  let patient2Cookie: string;

  beforeAll(async () => {
    jest.spyOn(UserModel, 'findOne').mockImplementation(((query: any) => {
      const email = query?.email;
      const id = query?._id;
      const user = testUsers.find((u) => u.email === email || u._id === id);
      return Promise.resolve(user as any);
    }) as any);

    // Obtain session cookie for Patient 1
    const res1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@example.com', password: 'Password123!' });
    patient1Cookie = res1.headers['set-cookie']?.[0]?.split(';')[0] || '';

    // Obtain session cookie for Patient 2
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient2@example.com', password: 'Password123!' });
    patient2Cookie = res2.headers['set-cookie']?.[0]?.split(';')[0] || '';
  });

  beforeEach(() => {
    jest.spyOn(PatientModel, 'findOne').mockImplementation(((query: any) => {
      if (query?.patientId === 'PT-1001') {
        return Promise.resolve(testPatient as any);
      }
      return Promise.resolve(null);
    }) as any);

    const createChain = (data: any[]) => {
      const chain: any = {
        sort: () => chain,
        then: (resolve: any, reject?: any) => Promise.resolve(data).then(resolve, reject),
      };
      return chain;
    };

    jest.spyOn(ObservationModel, 'find').mockImplementation(((query: any) => {
      const data = query?.patientId === 'PT-1001' ? testObservations : [];
      return createChain(data);
    }) as any);

    jest.spyOn(MedicationStatementModel, 'find').mockImplementation(((query: any) => {
      const data = query?.patientId === 'PT-1001' ? testMedications : [];
      return createChain(data);
    }) as any);

    jest.spyOn(DiagnosticReportModel, 'find').mockImplementation(((query: any) => {
      if (query?.patientId === 'PT-1001') {
        return Promise.resolve(testReports as any);
      }
      return Promise.resolve([] as any);
    }) as any);

    jest.spyOn(ConditionModel, 'find').mockImplementation(((query: any) => {
      if (query?.patientId === 'PT-1001') {
        return Promise.resolve(testConditions as any);
      }
      return Promise.resolve([] as any);
    }) as any);

    jest.spyOn(DocumentModel, 'find').mockImplementation(((query: any) => {
      const data = query?.patientId === 'PT-1001' ? testDocuments : [];
      return createChain(data);
    }) as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. ABDM / HL7 FHIR R4 Bundle Exporter', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/patients/PT-1001/fhir-bundle');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('CRITICAL: should DENY cross-tenant access when Patient 2 requests Patient 1 FHIR bundle', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001/fhir-bundle')
        .set('Cookie', patient2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });

    it('should export valid FHIR R4 Bundle for authenticated patient', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001/fhir-bundle')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.resourceType).toBe('Bundle');
      expect(res.body.type).toBe('collection');
      expect(res.body.entry).toBeDefined();
      expect(Array.isArray(res.body.entry)).toBe(true);

      const resourceTypes = res.body.entry.map((e: any) => e.resource.resourceType);
      expect(resourceTypes).toContain('Composition');
      expect(resourceTypes).toContain('Patient');
      expect(resourceTypes).toContain('Observation');
      expect(resourceTypes).toContain('MedicationStatement');
      expect(resourceTypes).toContain('DiagnosticReport');
      expect(resourceTypes).toContain('Condition');
      expect(resourceTypes).toContain('DocumentReference');

      // Verify Patient resource attributes
      const patientEntry = res.body.entry.find((e: any) => e.resource.resourceType === 'Patient');
      expect(patientEntry.resource.name[0].text).toBe('Ramesh Kumar');
      expect(patientEntry.resource.identifier[0].value).toBe('91-8472-1923-0192');

      // Verify Observation attributes
      const obsEntry = res.body.entry.find(
        (e: any) =>
          e.resource.resourceType === 'Observation' &&
          e.resource.code.text === 'Fasting Blood Sugar'
      );
      expect(obsEntry).toBeDefined();
      expect(obsEntry.resource.valueQuantity.value).toBe(134);
      expect(obsEntry.resource.interpretation[0].text).toBe('HIGH');
    });
  });

  describe('2. Longitudinal Biomarker Trends (Recharts Data Provider)', () => {
    it('should aggregate observation trends with hasEnoughData flag', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001/trends')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.trends)).toBe(true);

      const fbs = res.body.trends.find((t: any) => t.testName === 'Fasting Blood Sugar');
      expect(fbs).toBeDefined();
      expect(fbs.hasEnoughData).toBe(true); // 2 data points (134 and 118)
      expect(fbs.dataPoints.length).toBe(2);
      expect(fbs.referenceLow).toBe(70);
      expect(fbs.referenceHigh).toBe(100);

      // Serum Creatinine has only 1 data point
      const creat = res.body.trends.find((t: any) => t.testName === 'Serum Creatinine');
      expect(creat).toBeDefined();
      expect(creat.hasEnoughData).toBe(false); // only 1 data point
    });
  });

  describe('3. Patient Medications & Calendar Timeline', () => {
    it('should return patient medications with active status and dosage', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001/medications')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.medications)).toBe(true);
      expect(res.body.medications[0].name).toBe('Metformin');
      expect(res.body.medications[0].dosage).toBe('500mg');
    });

    it('should return calendar events organized by date', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001/calendar')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBe(2);
      expect(res.body.events[0].date).toBe('2026-02-10');
    });
  });
});
