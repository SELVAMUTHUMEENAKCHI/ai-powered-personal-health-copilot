import mongoose, { Document, Schema } from 'mongoose';
import { Interpretation } from '@health-copilot/shared';

export interface IObservation extends Document {
  resourceType: 'Observation';
  patientId: string;
  documentId: string;
  code: string;
  value: number | string;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  interpretation: Interpretation;
  plainLanguageNote?: string;
  effectiveDateTime: Date | null;
  issued: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ObservationSchema = new Schema<IObservation>(
  {
    resourceType: {
      type: String,
      default: 'Observation',
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
    code: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    unit: {
      type: String,
      default: null,
    },
    referenceLow: {
      type: Number,
      default: null,
    },
    referenceHigh: {
      type: Number,
      default: null,
    },
    interpretation: {
      type: String,
      enum: ['NORMAL', 'HIGH', 'LOW', 'UNSPECIFIED'],
      default: 'UNSPECIFIED',
    },
    plainLanguageNote: {
      type: String,
    },
    effectiveDateTime: {
      type: Date,
      default: null,
      index: true,
    },
    issued: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const ObservationModel = mongoose.model<IObservation>('Observation', ObservationSchema);
