import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/database';
import { UserModel } from '../models/user.model';
import { PatientModel } from '../models/patient.model';

export async function runSeed(): Promise<void> {
  console.log('[Seed] Starting database seed...');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Clear existing users and patients for fresh seed
  await UserModel.deleteMany({});
  await PatientModel.deleteMany({});
  console.log('[Seed] Cleared existing users and patients.');

  // Pre-hash default passwords
  const adminHash = await bcrypt.hash('AdminPassword123!', 10);
  const patientHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Administrator
  const adminUser = await UserModel.create({
    email: 'admin@altrix.health',
    passwordHash: adminHash,
    role: 'admin',
    patientId: null,
    name: 'Clinical Admin',
  });
  console.log(`[Seed] Created Admin: ${adminUser.email}`);

  // 2. Seed Patient 1 (PT-1001: Ramesh Kumar)
  const patient1 = await PatientModel.create({
    patientId: 'PT-1001',
    name: 'Ramesh Kumar',
    dob: new Date('1984-06-15'),
    gender: 'male',
    bloodGroup: 'B+',
    phone: '+91-9876543210',
    abhaId: '91-8472-1923-0192',
    abhaStatus: 'verified',
    lastSync: new Date(),
  });

  await UserModel.create({
    email: 'ramesh@example.com',
    passwordHash: patientHash,
    role: 'patient',
    patientId: patient1.patientId,
    name: patient1.name,
  });
  console.log(`[Seed] Created Patient: ${patient1.name} (${patient1.patientId}) -> ramesh@example.com`);

  // 3. Seed Patient 2 (PT-1002: Priya Sundaram)
  const patient2 = await PatientModel.create({
    patientId: 'PT-1002',
    name: 'Priya Sundaram',
    dob: new Date('1991-09-22'),
    gender: 'female',
    bloodGroup: 'O+',
    phone: '+91-9876543211',
    abhaId: '91-1122-3344-5566',
    abhaStatus: 'verified',
    lastSync: new Date(),
  });

  await UserModel.create({
    email: 'priya@example.com',
    passwordHash: patientHash,
    role: 'patient',
    patientId: patient2.patientId,
    name: patient2.name,
  });
  console.log(`[Seed] Created Patient: ${patient2.name} (${patient2.patientId}) -> priya@example.com`);

  // 4. Seed Patient 3 (PT-1003: Anand Sharma)
  const patient3 = await PatientModel.create({
    patientId: 'PT-1003',
    name: 'Anand Sharma',
    dob: new Date('1978-03-10'),
    gender: 'male',
    bloodGroup: 'A+',
    phone: '+91-9876543212',
    abhaId: '91-9988-7766-5544',
    abhaStatus: 'mock',
    lastSync: new Date(),
  });

  await UserModel.create({
    email: 'anand@example.com',
    passwordHash: patientHash,
    role: 'patient',
    patientId: patient3.patientId,
    name: patient3.name,
  });
  console.log(`[Seed] Created Patient: ${patient3.name} (${patient3.patientId}) -> anand@example.com`);

  console.log('[Seed] Seeding completed successfully!');
}

if (require.main === module) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Seeding failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}
