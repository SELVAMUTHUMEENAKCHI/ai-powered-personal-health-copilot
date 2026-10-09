import mongoose, { Document, Schema } from 'mongoose';
import { Gender, AbhaStatus } from '@health-copilot/shared';

export interface IPatient extends Document {
  patientId: string; // e.g. PT-1001
  name: string;
  dob: Date;
  gender: Gender;
  bloodGroup: string;
  phone?: string;
  abhaId?: string;
  abhaStatus: AbhaStatus;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      default: 'Unknown',
    },
    phone: {
      type: String,
      trim: true,
    },
    abhaId: {
      type: String,
      trim: true,
      default: null,
    },
    abhaStatus: {
      type: String,
      enum: ['verified', 'unverified', 'mock'],
      default: 'mock',
    },
    lastSync: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const PatientModel = mongoose.model<IPatient>('Patient', PatientSchema);
