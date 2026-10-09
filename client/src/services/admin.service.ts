import { apiRequest } from './api';
import { MedicalDocument, UploadJob, DocumentReviewInput } from '@health-copilot/shared';

export interface BulkUploadResponse {
  success: boolean;
  message: string;
  jobId: string;
  totalFiles: number;
  status: string;
  pollUrl: string;
}

export interface PatientListItem {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  abhaId: string;
  abhaStatus: 'verified' | 'unverified' | 'pending';
  documentCount: number;
  lastRecordDate: string | null;
}

export interface PatientListResponse {
  success: boolean;
  total: number;
  patients: PatientListItem[];
  page: number;
  limit: number;
}

export const AdminApiService = {
  async listPatients(query = '', page = 1, limit = 50): Promise<PatientListResponse> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('page', String(page));
    params.append('limit', String(limit));

    return apiRequest<PatientListResponse>(`/patients?${params.toString()}`);
  },

  async bulkUpload(files: File[]): Promise<BulkUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return apiRequest<BulkUploadResponse>('/documents/bulk-upload', {
      method: 'POST',
      data: formData,
    });
  },

  async getJobStatus(jobId: string): Promise<UploadJob> {
    return apiRequest<UploadJob>(`/documents/jobs/${jobId}`);
  },

  async reviewDocument(documentId: string, reviewData: DocumentReviewInput): Promise<MedicalDocument> {
    const res = await apiRequest<{ success: boolean; message: string; document: MedicalDocument }>(
      `/documents/${documentId}/review`,
      {
        method: 'PATCH',
        data: reviewData,
      }
    );
    return res.document;
  },

  async listAllDocuments(patientId?: string): Promise<MedicalDocument[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<{ success: boolean; total: number; documents: MedicalDocument[] }>(
      `/documents${qs}`
    );
    return res.documents;
  },
};
