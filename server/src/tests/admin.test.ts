import request from 'supertest';
import { app } from '../app';
import { UserModel } from '../models/user.model';
import { PatientModel } from '../models/patient.model';
import { DocumentModel } from '../models/document.model';
import { UploadJobModel } from '../models/uploadJob.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import bcrypt from 'bcryptjs';

describe('Phase 4: Admin Portal, Bulk Upload & Review Test Suite', () => {
  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const adminHash = bcrypt.hashSync('AdminPassword123!', 10);

  const testUsers = [
    {
      _id: '670529d10e012a938c401001',
      email: 'admin@altrix.health',
      passwordHash: adminHash,
      role: 'admin',
      patientId: null,
      name: 'Clinical Admin',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, adminHash),
    },
    {
      _id: '670529d10e012a938c401002',
      email: 'patient1@example.com',
      passwordHash,
      role: 'patient',
      patientId: 'PT-1001',
      name: 'Ramesh Kumar',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, passwordHash),
    },
  ];

  const testPatients = [
    {
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
    },
    {
      _id: '670529d10e012a938c402002',
      patientId: 'PT-1002',
      name: 'Priya Sundaram',
      dob: new Date('1991-09-22'),
      gender: 'female',
      bloodGroup: 'O+',
      phone: '+91-9876543211',
      abhaId: '91-8472-1923-0193',
      abhaStatus: 'verified',
      lastSync: new Date(),
    },
  ];

  const testDoc = {
    _id: '670529d10e012a938c403001',
    documentId: 'DOC-TEST-4001',
    patientId: 'PT-1001',
    patientName: 'Ramesh Kumar',
    fileName: 'PT-1001_blood_report.pdf',
    fileType: 'application/pdf',
    storageRef: '670529d10e012a938c404001',
    fileHash: 'sha256-test-hash-4001',
    uploadedAt: new Date('2026-09-28'),
    uploadedBy: '670529d10e012a938c401001',
    uploadedRole: 'admin',
    reportDate: '2026-09-28',
    documentType: 'lab_report',
    aiSummary: 'Preliminary AI extraction pending verification.',
    abnormalFindings: [
      {
        testName: 'Fasting Blood Sugar',
        value: 134,
        unit: 'mg/dL',
        referenceRange: { low: 70, high: 100 },
        interpretation: 'HIGH',
        plainLanguageNote: 'Glucose is above reference range.',
      },
    ],
    medicines: [],
    explicitDiagnoses: ['Type 2 Diabetes'],
    processingStatus: 'Completed',
    errorReason: null,
    adminReviewed: false,
    save: jest.fn().mockResolvedValue(true),
  };

  let adminCookie: string;
  let patientCookie: string;

  beforeAll(async () => {
    // Spies for in-memory model queries
    jest.spyOn(UserModel, 'findOne').mockImplementation(((query: any) => {
      const email = query?.email?.toLowerCase?.() || query?.email;
      const found = testUsers.find((u) => u.email === email || u._id === query?._id);
      return Promise.resolve(found as any) as any;
    }) as any);

    jest.spyOn(PatientModel, 'findOne').mockImplementation(((query: any) => {
      const pid = query?.patientId;
      const found = testPatients.find((p) => p.patientId === pid);
      return Promise.resolve(found as any) as any;
    }) as any);

    // Spies for Document, Observation, Medication
    jest.spyOn(DocumentModel, 'findOne').mockImplementation(((query: any) => {
      const docId = query?.documentId;
      const result = docId === 'DOC-TEST-4001' ? testDoc : null;
      const chain: any = {
        sort: () => chain,
        then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
      };
      return chain;
    }) as any);

    jest.spyOn(ObservationModel, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);
    jest.spyOn(ObservationModel, 'insertMany').mockResolvedValue([] as any);
    jest.spyOn(MedicationStatementModel, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 0 } as any);
    jest.spyOn(MedicationStatementModel, 'insertMany').mockResolvedValue([] as any);

    // Upload job creation spy
    jest.spyOn(UploadJobModel, 'create').mockImplementation(((data: any) => {
      return Promise.resolve({
        ...(data as object),
        _id: '670529d10e012a938c409999',
        save: jest.fn().mockResolvedValue(true),
      } as any);
    }) as any);

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@altrix.health', password: 'AdminPassword123!' });
    adminCookie = adminRes.headers['set-cookie'][0];

    // Authenticate Patient
    const patientRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@example.com', password: 'Password123!' });
    patientCookie = patientRes.headers['set-cookie'][0];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Bulk Document Ingestion API', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 test content for bulk ingestion');
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    it('CRITICAL: should reject non-admin patient attempting bulk upload with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/documents/bulk-upload')
        .set('Cookie', patientCookie)
        .attach('files', validPdfBuffer, 'PT-1001_report.pdf');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
    });

    it('should reject bulk upload if no files are attached with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/documents/bulk-upload')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_FILES');
    });

    it('should accept valid multi-file bulk batch from Admin and return 202 Accepted', async () => {
      const res = await request(app)
        .post('/api/documents/bulk-upload')
        .set('Cookie', adminCookie)
        .attach('files', validPdfBuffer, 'PT-1001_blood_report.pdf')
        .attach('files', validPngBuffer, 'PT-1002_rx_tamil.png');

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toMatch(/^JOB-/);
      expect(res.body.totalFiles).toBe(2);
      expect(res.body.pollUrl).toBe(`/api/documents/jobs/${res.body.jobId}`);
    });
  });

  describe('2. Human-in-the-Loop Document Review Screen API', () => {
    it('CRITICAL: should reject patient attempting to review/modify records with 403 Forbidden', async () => {
      const res = await request(app)
        .patch('/api/documents/DOC-TEST-4001/review')
        .set('Cookie', patientCookie)
        .send({
          reportDate: '2026-09-30',
          adminReviewed: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
    });

    it('should return 404 for non-existent document review', async () => {
      const res = await request(app)
        .patch('/api/documents/DOC-NON-EXISTENT/review')
        .set('Cookie', adminCookie)
        .send({
          adminReviewed: true,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('should allow Admin to review, correct findings, and update clinical parameters', async () => {
      const reviewPayload = {
        reportDate: '2026-09-29',
        documentType: 'lab_report',
        aiSummary: 'Admin verified: Fasting blood sugar slightly elevated at 134 mg/dL.',
        abnormalFindings: [
          {
            testName: 'Fasting Blood Sugar',
            value: 134,
            unit: 'mg/dL',
            referenceRange: { low: 70, high: 100 },
            interpretation: 'HIGH',
            plainLanguageNote: 'Glucose exceeds reference range.',
          },
        ],
        medicines: [
          {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Once daily',
            duration: '30 days',
            instructions: 'With food',
            confidence: 'high',
          },
        ],
        explicitDiagnoses: ['Type 2 Diabetes Mellitus'],
        adminReviewed: true,
      };

      const res = await request(app)
        .patch('/api/documents/DOC-TEST-4001/review')
        .set('Cookie', adminCookie)
        .send(reviewPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.document.adminReviewed).toBe(true);
      expect(res.body.document.reportDate).toBe('2026-09-29');
      expect(testDoc.save).toHaveBeenCalled();
      expect(ObservationModel.deleteMany).toHaveBeenCalledWith({ documentId: 'DOC-TEST-4001' });
      expect(ObservationModel.insertMany).toHaveBeenCalled();
      expect(MedicationStatementModel.deleteMany).toHaveBeenCalledWith({ documentId: 'DOC-TEST-4001' });
      expect(MedicationStatementModel.insertMany).toHaveBeenCalled();
    });
  });

  describe('3. Patient Registry & Search API', () => {
    it('should allow Admin to search patients by name or ID', async () => {
      // Mock search query
      jest.spyOn(PatientModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(testPatients),
      } as any);
      jest.spyOn(PatientModel, 'countDocuments').mockResolvedValue(2);
      jest.spyOn(DocumentModel, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/patients?query=Ramesh')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patients.length).toBeGreaterThan(0);
      expect(res.body.patients[0].name).toBe('Ramesh Kumar');
    });
  });
});
