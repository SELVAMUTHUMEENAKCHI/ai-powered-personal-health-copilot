import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicationStatement extends Document {
  resourceType: 'MedicationStatement';
  patientId: string;
  documentId: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: 'active' | 'completed' | 'stopped' | 'unknown';
  confidence: 'high' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

const MedicationStatementSchema = new Schema<IMedicationStatement>(
  {
    resourceType: {
      type: String,
      default: 'MedicationStatement',
      required: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    medicationName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dosage: {
      type: String,
      default: null,
    },
    frequency: {
      type: String,
      default: null,
    },
    duration: {
      type: String,
      default: null,
    },
    instructions: {
      type: String,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'stopped', 'unknown'],
      default: 'unknown',
    },
    confidence: {
      type: String,
      enum: ['high', 'low'],
      default: 'high',
    },
  },
  { timestamps: true }
);

export const MedicationStatementModel = mongoose.model<IMedicationStatement>(
  'MedicationStatement',
  MedicationStatementSchema
);
