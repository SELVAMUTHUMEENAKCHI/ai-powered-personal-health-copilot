import request from 'supertest';
import { app } from '../app';
import { UserModel, IUser } from '../models/user.model';
import { PatientModel, IPatient } from '../models/patient.model';
import { DocumentModel } from '../models/document.model';
import bcrypt from 'bcryptjs';

describe('Security & Tenant Isolation Test Suite', () => {
  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const adminHash = bcrypt.hashSync('AdminPassword123!', 10);

  // In-memory test entities
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
      abhaId: '91-1122-3344-5566',
      abhaStatus: 'verified',
      lastSync: new Date(),
    },
  ];

  beforeAll(() => {
    // Mock UserModel.findOne
    jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
      const email = query?.email?.toLowerCase?.() || query?.email;
      const found = testUsers.find((u) => u.email === email);
      return Promise.resolve(found as unknown as IUser) as any;
    });

    // Mock PatientModel.findOne
    jest.spyOn(PatientModel, 'findOne').mockImplementation((query: any) => {
      const pid = query?.patientId;
      const found = testPatients.find((p) => p.patientId === pid);
      return Promise.resolve(found as unknown as IPatient) as any;
    });

    // Mock PatientModel.find with chainable sort, skip, limit
    jest.spyOn(PatientModel, 'find').mockImplementation(() => {
      const chain: any = {
        sort: () => chain,
        skip: () => chain,
        limit: () => Promise.resolve(testPatients as unknown as IPatient[]),
      };
      return chain;
    });

    jest.spyOn(PatientModel, 'countDocuments').mockResolvedValue(testPatients.length);

    // Mock DocumentModel to support searchPatients enrichment
    jest.spyOn(DocumentModel, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(DocumentModel, 'findOne').mockImplementation(() => {
      const chain: any = {
        sort: () => Promise.resolve(null),
      };
      return chain;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Authentication Gateways', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/patients/PT-1001');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should authenticate valid patient and set httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient1@example.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.patientId).toBe('PT-1001');

      // Verify Set-Cookie header contains httpOnly
      const cookieHeader = res.headers['set-cookie']?.[0];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should reject invalid credentials with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient1@example.com', password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('2. Cross-Tenant Patient Isolation (SEC-01)', () => {
    let patient1Cookie: string;
    let patient2Cookie: string;

    beforeAll(async () => {
      // Login as Patient 1 (PT-1001)
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient1@example.com', password: 'Password123!' });
      patient1Cookie = res1.headers['set-cookie']![0].split(';')[0];

      // Login as Patient 2 (PT-1002)
      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient2@example.com', password: 'Password123!' });
      patient2Cookie = res2.headers['set-cookie']![0].split(';')[0];
    });

    it('should allow Patient 1 to access their own records (PT-1001)', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001')
        .set('Cookie', [patient1Cookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.patientId).toBe('PT-1001');
      expect(res.body.patient.name).toBe('Ramesh Kumar');
    });

    it('CRITICAL: should DENY Patient 1 access to Patient 2 records (PT-1002) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1002')
        .set('Cookie', [patient1Cookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_ISOLATION_VIOLATION');
      expect(res.body.patient).toBeUndefined();
    });

    it('CRITICAL: should DENY Patient 2 access to Patient 1 records (PT-1001) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001')
        .set('Cookie', [patient2Cookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_ISOLATION_VIOLATION');
      expect(res.body.patient).toBeUndefined();
    });
  });

  describe('3. Role Privilege Escalation Prevention (SEC-02)', () => {
    let patientCookie: string;
    let adminCookie: string;

    beforeAll(async () => {
      const pRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'patient1@example.com', password: 'Password123!' });
      patientCookie = pRes.headers['set-cookie']![0].split(';')[0];

      const aRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@altrix.health', password: 'AdminPassword123!' });
      adminCookie = aRes.headers['set-cookie']![0].split(';')[0];
    });

    it('CRITICAL: should DENY Patient calling Admin-only API (GET /api/patients) with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Cookie', [patientCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
    });

    it('should ALLOW Admin to list all patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patients).toBeDefined();
      expect(res.body.patients.length).toBeGreaterThanOrEqual(2);
    });

    it('should ALLOW Admin to access individual patient record (PT-1001)', async () => {
      const res = await request(app)
        .get('/api/patients/PT-1001')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.patientId).toBe('PT-1001');
    });

    it('should successfully log out and clear cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [patientCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookieHeader = res.headers['set-cookie']?.[0];
      expect(cookieHeader).toBeDefined();
      // Cleared cookie has empty value or max-age=0/expires in past
      expect(cookieHeader).toContain('token=;');
    });
  });
});
