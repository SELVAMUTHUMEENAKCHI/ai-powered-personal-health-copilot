import { apiRequest } from './api';
import { Patient, PatientSummary } from '@health-copilot/shared';

export interface TimelineItem {
  documentId: string;
  effectiveDate: string;
  dateSource: 'report_date' | 'upload_date';
  documentType: string;
  title: string;
  fileName: string;
  abnormalCount: number;
  abnormalItems?: string[];
  medicinesCount: number;
  processingStatus: string;
}

export const PatientApiService = {
  async getProfile(patientId: string): Promise<Patient> {
    const res = await apiRequest<{ success: boolean; patient: Patient }>(`/patients/${patientId}`);
    return res.patient;
  },

  async getSummary(patientId: string): Promise<PatientSummary> {
    const res = await apiRequest<{ success: boolean; summary: PatientSummary }>(`/patients/${patientId}/summary`);
    return res.summary;
  },

  async updateProfile(patientId: string, data: Partial<Patient>): Promise<{ success: boolean; message: string; patient: Patient }> {
    return apiRequest<{ success: boolean; message: string; patient: Patient }>(`/patients/${patientId}`, {
      method: 'PATCH',
      data,
    });
  },
};
