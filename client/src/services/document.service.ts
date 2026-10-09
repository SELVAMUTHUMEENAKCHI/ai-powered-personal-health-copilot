import { apiRequest } from './api';
import { MedicalDocument, UploadJob } from '@health-copilot/shared';

export interface UploadResponse {
  success: boolean;
  message: string;
  jobId: string;
  initialStatus: string;
}

export const DocumentApiService = {
  async upload(file: File, documentTypeHint?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (documentTypeHint) {
      formData.append('documentType', documentTypeHint);
    }

    return apiRequest<UploadResponse>('/documents/upload', {
      method: 'POST',
      data: formData,
    });
  },

  async getJobStatus(jobId: string): Promise<UploadJob> {
    const res = await apiRequest<{ success: boolean } & UploadJob>(`/documents/jobs/${jobId}`);
    return res;
  },

  async listDocuments(patientId?: string, type?: string): Promise<MedicalDocument[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (type) params.append('type', type);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<{ success: boolean; total: number; documents: MedicalDocument[] }>(
      `/documents${qs}`
    );
    return res.documents;
  },

  async getDocument(documentId: string): Promise<MedicalDocument> {
    const res = await apiRequest<{ success: boolean; document: MedicalDocument }>(
      `/documents/${documentId}`
    );
    return res.document;
  },

  getFileStreamUrl(documentId: string): string {
    return `/api/documents/${documentId}/file`;
  },
};
