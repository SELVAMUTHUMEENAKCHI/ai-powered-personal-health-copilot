import mongoose, { Document, Schema } from 'mongoose';
import {
  DocumentType,
  ProcessingStatus,
  AbnormalFinding,
  ExtractedMedicine,
} from '@health-copilot/shared';

export interface IDocument extends Document {
  documentId: string;
  patientId: string;
  patientName: string;
  fileName: string;
  fileType: string;
  storageRef: mongoose.Types.ObjectId;
  fileHash: string;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedRole: 'admin' | 'patient';
  reportDate: string | null;
  documentType: DocumentType;
  ocrText?: string;
  rawExtraction?: unknown;
  aiSummary: string | null;
  abnormalFindings: AbnormalFinding[];
  medicines: ExtractedMedicine[];
  explicitDiagnoses: string[];
  processingStatus: ProcessingStatus;
  errorReason: string | null;
  adminReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AbnormalFindingSchema = new Schema(
  {
    testName: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, default: null },
    referenceRange: {
      low: { type: Number, default: null },
      high: { type: Number, default: null },
      rawText: { type: String, default: null },
    },
    interpretation: {
      type: String,
      enum: ['NORMAL', 'HIGH', 'LOW', 'UNSPECIFIED'],
      required: true,
    },
    plainLanguageNote: { type: String, required: true },
  },
  { _id: false }
);

const ExtractedMedicineSchema = new Schema(
  {
    name: { type: String, required: true },
    dosage: { type: String, default: null },
    frequency: { type: String, default: null },
    duration: { type: String, default: null },
    instructions: { type: String, default: null },
    confidence: { type: String, enum: ['high', 'low'], default: 'high' },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
  },
  { _id: false }
);

const DocumentSchema = new Schema<IDocument>(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    storageRef: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    fileHash: {
      type: String,
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    uploadedRole: {
      type: String,
      enum: ['admin', 'patient'],
      required: true,
    },
    reportDate: {
      type: String,
      default: null,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['lab_report', 'prescription', 'discharge_summary', 'other'],
      default: 'other',
    },
    ocrText: {
      type: String,
    },
    rawExtraction: {
      type: Schema.Types.Mixed,
    },
    aiSummary: {
      type: String,
      default: null,
    },
    abnormalFindings: [AbnormalFindingSchema],
    medicines: [ExtractedMedicineSchema],
    explicitDiagnoses: [{ type: String }],
    processingStatus: {
      type: String,
      enum: [
        'Queued',
        'OCR Processing',
        'Extracting',
        'Validating',
        'Saved',
        'Completed',
        'Failed',
      ],
      default: 'Queued',
      index: true,
    },
    errorReason: {
      type: String,
      default: null,
    },
    adminReviewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
