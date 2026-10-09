import request from 'supertest';
import { app } from '../app';
import { UserModel } from '../models/user.model';
import { PatientModel } from '../models/patient.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { DocumentModel } from '../models/document.model';
import { ConditionModel } from '../models/condition.model';
import { ChatSessionModel } from '../models/chatSession.model';
import { GeminiProvider } from '../ai/providers/gemini.provider';
import bcrypt from 'bcryptjs';

describe('Phase 5: Grounded Copilot Chat & Multilingual Test Suite', () => {
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
      effectiveDateTime: new Date('2026-09-28'),
    },
    {
      _id: '670529d10e012a938c405002',
      patientId: 'PT-1001',
      documentId: 'DOC-1001',
      code: 'Serum Creatinine',
      value: 0.9,
      unit: 'mg/dL',
      referenceLow: 0.7,
      referenceHigh: 1.3,
      interpretation: 'NORMAL',
      effectiveDateTime: new Date('2026-09-28'),
    },
  ];

  const testMedications = [
    {
      _id: '670529d10e012a938c406001',
      patientId: 'PT-1001',
      documentId: 'DOC-1001',
      medicationName: 'Metformin',
      dosage: '500mg',
      frequency: 'Once daily with dinner',
      duration: '30 days',
      status: 'active',
      confidence: 'high',
    },
  ];

  const testDocuments = [
    {
      _id: '670529d10e012a938c407001',
      documentId: 'DOC-1001',
      patientId: 'PT-1001',
      fileName: 'PT-1001_blood_report.pdf',
      documentType: 'lab_report',
      reportDate: '2026-09-28',
      aiSummary: 'Fasting glucose elevated at 134 mg/dL. Kidney markers normal.',
    },
  ];

  let patient1Cookie: string;

  beforeAll(async () => {
    // Spies for models
    jest.spyOn(UserModel, 'findOne').mockImplementation(((query: any) => {
      const email = query?.email?.toLowerCase?.() || query?.email;
      const found = testUsers.find((u) => u.email === email || u._id === query?._id);
      return Promise.resolve(found as any) as any;
    }) as any);

    jest.spyOn(PatientModel, 'findOne').mockImplementation(((query: any) => {
      const pid = query?.patientId;
      if (pid === 'PT-1001') {
        return Promise.resolve(testPatient as any) as any;
      }
      return Promise.resolve(null) as any;
    }) as any);

    jest.spyOn(ObservationModel, 'find').mockImplementation(((query: any) => {
      const chain: any = {
        sort: () => Promise.resolve(query?.patientId === 'PT-1001' ? testObservations : []),
        then: (resolve: any, reject?: any) =>
          Promise.resolve(query?.patientId === 'PT-1001' ? testObservations : []).then(resolve, reject),
      };
      return chain;
    }) as any);

    jest.spyOn(MedicationStatementModel, 'find').mockImplementation(((query: any) => {
      return Promise.resolve(query?.patientId === 'PT-1001' ? testMedications : []) as any;
    }) as any);

    jest.spyOn(DocumentModel, 'find').mockImplementation(((query: any) => {
      const chain: any = {
        sort: () => Promise.resolve(query?.patientId === 'PT-1001' ? testDocuments : []),
        then: (resolve: any, reject?: any) =>
          Promise.resolve(query?.patientId === 'PT-1001' ? testDocuments : []).then(resolve, reject),
      };
      return chain;
    }) as any);

    jest.spyOn(ConditionModel, 'find').mockImplementation(((query: any) => {
      return Promise.resolve([]) as any;
    }) as any);

    // ChatSession spies
    const mockSession = {
      patientId: 'PT-1001',
      title: 'Consultation',
      messages: [],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(ChatSessionModel, 'findOne').mockImplementation(() => {
      const chain: any = {
        sort: () => Promise.resolve(mockSession),
        then: (res: any, rej?: any) => Promise.resolve(mockSession).then(res, rej),
      };
      return chain;
    });

    jest.spyOn(ChatSessionModel, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

    // Mock Gemini LLM response to eliminate live network delay and verify safety formatting
    jest.spyOn(GeminiProvider.prototype, 'answerPatientQuery').mockImplementation(async (context, query, lang) => {
      if (query.toLowerCase().includes('sugar') || query.toLowerCase().includes('fasting')) {
        return 'According to your records, Fasting Blood Sugar was 134 mg/dL on 2026-09-28, which is flagged HIGH above the reference range (70–100 mg/dL).';
      }
      if (query.toLowerCase().includes('tablet') || query.toLowerCase().includes('med')) {
        return 'You have 1 active medication: Metformin 500mg, taken once daily with dinner for 30 days.';
      }
      return 'Information not available in the uploaded records.';
    });

    // Authenticate Patient 1
    const p1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@example.com', password: 'Password123!' });
    patient1Cookie = p1Res.headers['set-cookie'][0];
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Input Validation & Authentication', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/chat/message').send({ message: 'What are my meds?' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty message query with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', patient1Cookie)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_MESSAGE');
    });
  });

  describe('2. Grounded Clinical Reasoning & Safety', () => {
    it('should answer lab query grounded strictly in patient records with mandatory disclaimer', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', patient1Cookie)
        .send({ message: 'What was my fasting sugar level in my latest report?', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBeDefined();
      expect(res.body.disclaimer).toBeDefined();
      expect(res.body.disclaimer).toContain('educational and organizational purposes only');
      expect(res.body.sources).toBeDefined();
      expect(res.body.sources.length).toBeGreaterThan(0);
      expect(res.body.sources[0].documentId).toBe('DOC-1001');
    });

    it('should handle Thanglish query seamlessly (e.g. "Enoda fasting sugar normal ah?")', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', patient1Cookie)
        .send({ message: 'Enoda fasting sugar report la normal ah?', language: 'ta' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBeDefined();
      expect(res.body.language).toBe('ta');
    });

    it('should answer medication queries based on prescribed records', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Cookie', patient1Cookie)
        .send({ message: 'What tablets am I taking and what is the dosage?', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBeDefined();
    });

    it('should retrieve conversation history for the authenticated patient', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patientId).toBe('PT-1001');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should clear chat history when requested', async () => {
      const res = await request(app)
        .delete('/api/chat/history')
        .set('Cookie', patient1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
