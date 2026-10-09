import mongoose, { Document, Schema } from 'mongoose';

export interface IEncounter extends Document {
  resourceType: 'Encounter';
  patientId: string;
  documentId: string;
  serviceProvider?: string;
  doctorName?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  reasonCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    resourceType: {
      type: String,
      default: 'Encounter',
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
    serviceProvider: {
      type: String,
      trim: true,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    periodStart: {
      type: Date,
      default: null,
    },
    periodEnd: {
      type: Date,
      default: null,
    },
    reasonCode: {
      type: String,
    },
  },
  { timestamps: true }
);

export const EncounterModel = mongoose.model<IEncounter>('Encounter', EncounterSchema);
