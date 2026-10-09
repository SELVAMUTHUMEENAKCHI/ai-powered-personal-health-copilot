export type DocumentType = 'lab_report' | 'prescription' | 'discharge_summary' | 'other';

export type ProcessingStatus =
  | 'Queued'
  | 'OCR Processing'
  | 'Extracting'
  | 'Validating'
  | 'Saved'
  | 'Completed'
  | 'Failed';

export type Interpretation = 'NORMAL' | 'HIGH' | 'LOW' | 'UNSPECIFIED';

export interface AbnormalFinding {
  testName: string;
  value: number | string;
  unit: string | null;
  referenceRange: {
    low: number | null;
    high: number | null;
    rawText?: string | null;
  } | null;
  interpretation: Interpretation;
  plainLanguageNote: string;
}

export interface ExtractedMedicine {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  confidence: 'high' | 'low';
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}


export interface ExtractedLabTest {
  name: string;
  value: number | string;
  unit: string | null;
  referenceRange: {
    low: number | null;
    high: number | null;
    rawText: string | null;
  } | null;
  interpretation?: Interpretation;
}

export interface MedicalDocument {
  _id?: string;
  documentId: string;
  patientId: string;
  patientName: string;
  fileName: string;
  fileType: string;
  storageRef: string; // GridFS file id
  fileHash: string; // SHA-256
  uploadedAt: string | Date;
  uploadedBy: string;
  uploadedRole: 'admin' | 'patient';
  reportDate: string | null; // ISO 8601 YYYY-MM-DD
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
}

export interface UploadJobFileStatus {
  fileName: string;
  patientId?: string;
  documentId?: string | null;
  status: ProcessingStatus;
  errorReason?: string | null;
}

export interface UploadJob {
  _id?: string;
  jobId: string;
  batchName: string;
  uploadedBy: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  files: UploadJobFileStatus[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
