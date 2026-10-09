import mongoose, { Document, Schema } from 'mongoose';
import { UploadJobFileStatus } from '@health-copilot/shared';

export interface IUploadJob extends Document {
  jobId: string;
  batchName: string;
  uploadedBy: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  files: UploadJobFileStatus[];
  createdAt: Date;
  updatedAt: Date;
}

const UploadJobFileStatusSchema = new Schema(
  {
    fileName: { type: String, required: true },
    patientId: { type: String, default: null },
    documentId: { type: String, default: null },
    status: {
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
    },
    errorReason: { type: String, default: null },
  },
  { _id: false }
);

const UploadJobSchema = new Schema<IUploadJob>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchName: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    totalFiles: {
      type: Number,
      required: true,
      default: 0,
    },
    processedFiles: {
      type: Number,
      required: true,
      default: 0,
    },
    successCount: {
      type: Number,
      required: true,
      default: 0,
    },
    failedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['queued', 'in_progress', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    files: [UploadJobFileStatusSchema],
  },
  { timestamps: true }
);

export const UploadJobModel = mongoose.model<IUploadJob>('UploadJob', UploadJobSchema);
