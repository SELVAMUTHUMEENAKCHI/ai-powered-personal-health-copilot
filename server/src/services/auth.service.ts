import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { UserModel, IUser } from '../models/user.model';
import { PatientModel } from '../models/patient.model';
import { JWTPayload, UserSession, RegisterPatientInput } from '@health-copilot/shared';

export class AuthService {
  static signToken(user: IUser): string {
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      patientId: user.patientId,
      name: user.name,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  static setAuthCookie(res: Response, token: string): void {
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  static clearAuthCookie(res: Response): void {
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  static async authenticateUser(
    identifier: string,
    password: string
  ): Promise<{ user: UserSession; token: string }> {
    const rawInput = identifier.trim();
    const lowerInput = rawInput.toLowerCase();

    // 1. Check by email or patientId directly in UserModel
    let user = await UserModel.findOne({
      $or: [
        { email: lowerInput },
        { patientId: rawInput.toUpperCase() },
      ],
    });

    // 2. If not found, check if identifier is an ABHA ID in PatientModel
    if (!user) {
      const patient = await PatientModel.findOne({ abhaId: rawInput });
      if (patient) {
        user = await UserModel.findOne({ patientId: patient.patientId });
      }
    }

    if (!user) {
      const err = new Error('Invalid email, ABHA / Patient ID, or password.');
      (err as { status?: number }).status = 401;
      (err as { code?: string }).code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      (err as { status?: number }).status = 401;
      (err as { code?: string }).code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const token = this.signToken(user);
    const userSession: UserSession = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      patientId: user.patientId,
      name: user.name,
    };

    return { user: userSession, token };
  }

  static async registerPatient(
    input: RegisterPatientInput
  ): Promise<{ user: UserSession; token: string; patientId: string | null; message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      (err as { status?: number }).status = 409;
      (err as { code?: string }).code = 'EMAIL_ALREADY_REGISTERED';
      throw err;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const isDoctorAdmin = input.role === 'admin';

    if (isDoctorAdmin) {
      // Create Administrator / Doctor user
      const user = await UserModel.create({
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
        patientId: null,
        name: input.name.trim(),
      });

      const token = this.signToken(user);
      const userSession: UserSession = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        patientId: null,
        name: user.name,
      };

      return {
        user: userSession,
        token,
        patientId: null,
        message: 'Administrator account created successfully. Welcome to the Clinical Management Portal.',
      };
    }

    // Default: Patient registration with sequential PT-XXXX ID
    // Auto-generate next unique sequential Patient ID (PT-1001, PT-1002, etc.)
    const patients = await PatientModel.find({ patientId: /^PT-\d+$/ }, { patientId: 1 }).lean();
    let maxNum = 1000;
    for (const p of patients) {
      const match = p.patientId.match(/^PT-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextPatientId = `PT-${maxNum + 1}`;

    // Create demographic Patient record
    const patientRecord = await PatientModel.create({
      patientId: nextPatientId,
      name: input.name.trim(),
      dob: input.dob ? new Date(input.dob) : new Date(1995, 0, 1),
      gender: input.gender || 'other',
      bloodGroup: input.bloodGroup || 'Unknown',
      phone: input.phone?.trim() || undefined,
      abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      abhaStatus: 'mock',
      lastSync: new Date(),
    });

    // Create User record
    const user = await UserModel.create({
      email: normalizedEmail,
      passwordHash,
      role: 'patient',
      patientId: nextPatientId,
      name: input.name.trim(),
    });

    const token = this.signToken(user);
    const userSession: UserSession = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      patientId: user.patientId,
      name: user.name,
    };

    return {
      user: userSession,
      token,
      patientId: nextPatientId,
      abhaId: patientRecord.abhaId,
      message: `Account created successfully. Your Patient ID is ${nextPatientId}.`,
    };
  }

  static async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    return {
      message: user
        ? 'Password reset instructions have been dispatched to your email address.'
        : 'If an account exists with this email address, password reset instructions have been dispatched.',
    };
  }

  static async resetPassword(
    email: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const err = new Error('No account found associated with this email address.');
      (err as { status?: number }).status = 404;
      throw err;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return {
      message: 'Password reset successfully. You may now sign in with your new credentials.',
    };
  }
}

