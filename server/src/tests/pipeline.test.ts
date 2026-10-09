import request from 'supertest';
import { app } from '../app';
import { evaluateTestValue, generateAbnormalNote, processAbnormalFindings } from '../ai/rules/rangeEvaluator';
import { normalizeDate } from '../ai/normalizer/dateNormalizer';
import { normalizeUnit } from '../ai/normalizer/unitNormalizer';
import { validateFileMagicBytes } from '../middleware/upload.middleware';
import { UserModel, IUser } from '../models/user.model';
import { PatientModel, IPatient } from '../models/patient.model';
import { UploadJobModel, IUploadJob } from '../models/uploadJob.model';
import { DocumentModel } from '../models/document.model';
import { JobQueueService } from '../services/jobQueue.service';
import bcrypt from 'bcryptjs';

describe('Phase 2: Ingestion, Pipeline & Deterministic Rules Test Suite', () => {
  describe('1. Deterministic Range Evaluation (AI-01)', () => {
    it('should flag HIGH when test value exceeds upper reference limit', () => {
      const result = evaluateTestValue(134, { low: 70, high: 100 });
      expect(result).toBe('HIGH');
    });

    it('should flag LOW when test value falls below lower reference limit', () => {
      const result = evaluateTestValue(55, { low: 70, high: 100 });
      expect(result).toBe('LOW');
    });

    it('should flag NORMAL when test value is within range', () => {
      const result = evaluateTestValue(88, { low: 70, high: 100 });
      expect(result).toBe('NORMAL');
    });

    it('should return UNSPECIFIED when report has no printed reference range', () => {
      const result = evaluateTestValue(134, null);
      expect(result).toBe('UNSPECIFIED');
    });

    it('should cleanly parse numeric values formatted as strings (e.g. "134 mg/dL")', () => {
      const result = evaluateTestValue('134 mg/dL', { low: 70, high: 100 });
      expect(result).toBe('HIGH');
    });

    it('should return UNSPECIFIED for qualitative non-numeric tests without range', () => {
      const result = evaluateTestValue('Negative', null);
      expect(result).toBe('UNSPECIFIED');
    });

    it('should generate safe non-diagnostic wording recommending healthcare professional discussion', () => {
      const note = generateAbnormalNote('Glucose Fasting', 134, 'mg/dL', 'HIGH', { low: 70, high: 100 });
      expect(note).toContain('above the reference range shown in the report');
      expect(note).toContain('Please discuss this with a qualified healthcare professional.');
      expect(note).not.toContain('You have diabetes');
    });

    it('should process entire test arrays and isolate only abnormal findings', () => {
      const tests = [
        { name: 'Glucose Fasting', value: 134, unit: 'mg/dL', referenceRange: { low: 70, high: 100 } },
        { name: 'Serum Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: { low: 0.7, high: 1.3 } },
      ];

      const abnormal = processAbnormalFindings(tests);
      expect(abnormal).toHaveLength(1);
      expect(abnormal[0].testName).toBe('Glucose Fasting');
      expect(abnormal[0].interpretation).toBe('HIGH');
    });
  });

  describe('2. Date & Unit Normalization', () => {
    it('should normalize varied clinical date strings to ISO YYYY-MM-DD', () => {
      expect(normalizeDate('28/09/2026')).toBe('2026-09-28');
      expect(normalizeDate('28-09-2026')).toBe('2026-09-28');
      expect(normalizeDate('September 28, 2026')).toBe('2026-09-28');
      expect(normalizeDate('2026-09-28')).toBe('2026-09-28');
    });

    it('should return null for missing or invalid dates without inventing data', () => {
      expect(normalizeDate(null)).toBeNull();
      expect(normalizeDate('Not available')).toBeNull();
      expect(normalizeDate('')).toBeNull();
    });

    it('should standardize clinical units', () => {
      expect(normalizeUnit('mg/dl')).toBe('mg/dL');
      expect(normalizeUnit('g/dl')).toBe('g/dL');
      expect(normalizeUnit('cells/cumm')).toBe('cells/cu.mm');
    });
  });

  describe('3. File Magic-Byte Validation', () => {
    it('should accept valid PDF headers (%PDF)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%...\n');
      const res = validateFileMagicBytes(pdfBuffer, 'report.pdf');
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('application/pdf');
      expect(res.sha256Hash).toBeDefined();
    });

    it('should accept valid PNG headers (0x89 P N G)', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const res = validateFileMagicBytes(pngBuffer, 'prescription.png');
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/png');
    });

    it('should accept valid JPEG headers (0xFF 0xD8 0xFF)', () => {
      const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const res = validateFileMagicBytes(jpgBuffer, 'prescription.jpg');
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toBe('image/jpeg');
    });

    it('should accept valid DOCX headers (PK 0x03 0x04)', () => {
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
      const res = validateFileMagicBytes(docxBuffer, 'discharge.docx');
      expect(res.isValid).toBe(true);
      expect(res.detectedMime).toContain('wordprocessingml');
    });

    it('should reject legacy DOC with friendly notice', () => {
      const legacyDocBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
      const res = validateFileMagicBytes(legacyDocBuffer, 'old.doc');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Limited support for legacy DOC');
    });

    it('should reject spoofed executable disguised as PDF', () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      const res = validateFileMagicBytes(exeBuffer, 'trojan.pdf');
      expect(res.isValid).toBe(false);
      expect(res.detectedMime).toBeNull();
    });
  });

  describe('4. Document Upload & Asynchronous Ingestion Gateway', () => {
    const passwordHash = bcrypt.hashSync('Password123!', 10);
    let patientCookie: string;
    let otherPatientCookie: string;

    const mockJob: Partial<IUploadJob> = {
      jobId: 'JOB-TEST-1234',
      batchName: 'Single Upload',
      uploadedBy: '670529d10e012a938c401002',
      totalFiles: 1,
      processedFiles: 1,
      successCount: 1,
      failedCount: 0,
      status: 'completed',
      files: [
        {
          fileName: 'report.pdf',
          patientId: 'PT-1001',
          documentId: 'DOC-123',
          status: 'Completed',
          errorReason: null,
        },
      ],
    };

    beforeAll(async () => {
      // Mock UserModel
      jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
        const email = query?.email;
        if (email === 'patient1@example.com') {
          return Promise.resolve({
            _id: '670529d10e012a938c401002',
            email: 'patient1@example.com',
            passwordHash,
            role: 'patient',
            patientId: 'PT-1001',
            name: 'Ramesh Kumar',
            comparePassword: async () => true,
          } as unknown as IUser) as any;
        }
        if (email === 'patient2@example.com') {
          return Promise.resolve({
            _id: '670529d10e012a938c401003',
            email: 'patient2@example.com',
            passwordHash,
            role: 'patient',
            patientId: 'PT-1002',
            name: 'Priya Sundaram',
            comparePassword: async () => true,
          } as unknown as IUser) as any;
        }
        return Promise.resolve(null);
      });

      // Mock PatientModel
      jest.spyOn(PatientModel, 'findOne').mockResolvedValue({
        patientId: 'PT-1001',
        name: 'Ramesh Kumar',
      } as unknown as IPatient);

      // Mock JobQueueService & UploadJobModel
      jest.spyOn(JobQueueService, 'enqueueJob').mockResolvedValue(mockJob as any);
      jest.spyOn(UploadJobModel, 'findOne').mockImplementation(((query: any) => {
        if (query.jobId === 'JOB-TEST-1234') {
          return Promise.resolve(mockJob as any);
        }
        return Promise.resolve(null);
      }) as any);

      // Mock DocumentModel
      jest.spyOn(DocumentModel, 'find').mockImplementation(() => {
        const chain: any = {
          sort: () => Promise.resolve([]),
        };
        return chain;
      });

      // Obtain session cookies
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient1@example.com', password: 'Password123!' });
      patientCookie = res1.headers['set-cookie']![0].split(';')[0];

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient2@example.com', password: 'Password123!' });
      otherPatientCookie = res2.headers['set-cookie']![0].split(';')[0];
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should accept valid PDF upload for authenticated patient and return 202 Accepted', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nSynthetic pathology report\n');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', [patientCookie])
        .attach('file', pdfBuffer, 'blood_report.pdf');

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Processing your medical document...');
      expect(res.body.jobId).toBeDefined();
    });

    it('should reject spoofed binary disguised as PDF with 415 Unsupported Media Type', async () => {
      const badBuffer = Buffer.from('FAKE-EXECUTABLE-BINARY');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Cookie', [patientCookie])
        .attach('file', badBuffer, 'corrupt.pdf');

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('should poll job status successfully for the uploading patient', async () => {
      const res = await request(app)
        .get('/api/documents/jobs/JOB-TEST-1234')
        .set('Cookie', [patientCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('JOB-TEST-1234');
      expect(res.body.totals.total).toBe(1);
    });

    it('CRITICAL: should DENY Patient 2 from polling Patient 1 upload job with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/documents/jobs/JOB-TEST-1234')
        .set('Cookie', [otherPatientCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_ISOLATION_VIOLATION');
    });
  });
});
