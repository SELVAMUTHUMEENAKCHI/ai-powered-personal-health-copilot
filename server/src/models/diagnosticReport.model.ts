import mongoose, { Document, Schema } from 'mongoose';

export interface IDiagnosticReport extends Document {
  resourceType: 'DiagnosticReport';
  patientId: string;
  documentId: string;
  code: string;
  status: 'final' | 'preliminary';
  effectiveDateTime: Date | null;
  conclusion: string | null;
  resultObservationIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticReportSchema = new Schema<IDiagnosticReport>(
  {
    resourceType: {
      type: String,
      default: 'DiagnosticReport',
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
    },
    status: {
      type: String,
      enum: ['final', 'preliminary'],
      default: 'final',
    },
    effectiveDateTime: {
      type: Date,
      default: null,
      index: true,
    },
    conclusion: {
      type: String,
      default: null,
    },
    resultObservationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Observation',
      },
    ],
  },
  { timestamps: true }
);

export const DiagnosticReportModel = mongoose.model<IDiagnosticReport>(
  'DiagnosticReport',
  DiagnosticReportSchema
);
