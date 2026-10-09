import request from 'supertest';
import { app } from '../app';
import { UserModel, IUser } from '../models/user.model';
import { PatientModel, IPatient } from '../models/patient.model';
import bcrypt from 'bcryptjs';

describe('Authentication & Patient Registration Test Suite', () => {
  const existingPasswordHash = bcrypt.hashSync('Password123!', 10);

  const existingUsers: any[] = [
    {
      _id: '670529d10e012a938c401002',
      email: 'ramesh@example.com',
      passwordHash: existingPasswordHash,
      role: 'patient',
      patientId: 'PT-1001',
      name: 'Ramesh Kumar',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, existingPasswordHash),
      save: async function () { return this; },
    },
    {
      _id: '670529d10e012a938c401003',
      email: 'priya@example.com',
      passwordHash: existingPasswordHash,
      role: 'patient',
      patientId: 'PT-1002',
      name: 'Priya Sundaram',
      comparePassword: async (pwd: string) => bcrypt.compare(pwd, existingPasswordHash),
      save: async function () { return this; },
    },
  ];

  const existingPatients: any[] = [
    {
      _id: '670529d10e012a938c402001',
      patientId: 'PT-1001',
      name: 'Ramesh Kumar',
      dob: new Date('1984-06-15'),
      gender: 'male',
      bloodGroup: 'B+',
      phone: '+91-9876543210',
      abhaId: '91-8472-1923-0192',
      abhaStatus: 'connected',
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
      abhaStatus: 'connected',
    },
  ];

  beforeAll(() => {
    // Mock UserModel.findOne
    jest.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
      const email = query?.email?.toLowerCase?.() || query?.email;
      const found = existingUsers.find((u) => u.email === email);
      return Promise.resolve(found as unknown as IUser) as any;
    });

    // Mock PatientModel.find for sequential ID calculation
    jest.spyOn(PatientModel, 'find').mockImplementation(() => {
      return {
        lean: () => Promise.resolve(existingPatients),
      } as any;
    });

    // Mock PatientModel.create
    jest.spyOn(PatientModel, 'create').mockImplementation((data: any) => {
      const created = {
        _id: '670529d10e012a938c402099',
        ...data,
      };
      existingPatients.push(created);
      return Promise.resolve(created as unknown as IPatient) as any;
    });

    // Mock UserModel.create
    jest.spyOn(UserModel, 'create').mockImplementation((data: any) => {
      const created = {
        _id: '670529d10e012a938c401099',
        ...data,
        comparePassword: async (pwd: string) => bcrypt.compare(pwd, data.passwordHash),
        save: async function () { return this; },
      };
      existingUsers.push(created);
      return Promise.resolve(created as unknown as IUser) as any;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Patient Self-Registration (PT-XXXX Generation)', () => {
    it('should register a new patient, auto-generate next sequential PT-1003 ID, and set cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Selva Muthu',
          email: 'selva@example.com',
          password: 'Password123!',
          dob: '2002-04-10',
          gender: 'male',
          bloodGroup: 'O+',
          phone: '+91-9988776655',
          preferredLanguage: 'ta',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.patientId).toBe('PT-1003');
      expect(res.body.message).toContain('Account created successfully. Your Patient ID is PT-1003.');
      expect(res.body.user.role).toBe('patient');
      expect(res.body.user.patientId).toBe('PT-1003');

      // Check httpOnly token cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    });

    it('should reject duplicate registration with the same email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ramesh Kumar',
          email: 'ramesh@example.com',
          password: 'Password123!',
          dob: '1984-06-15',
          gender: 'male',
          bloodGroup: 'B+',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('should reject registration if password is shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Password Recovery Workflows', () => {
    it('should dispatch password reset instructions via forgot-password endpoint', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ramesh@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset instructions have been dispatched');
    });

    it('should allow user to reset password with valid payload', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'ramesh@example.com',
          token: 'mock-valid-token-123',
          newPassword: 'NewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successfully');
    });
  });
});
