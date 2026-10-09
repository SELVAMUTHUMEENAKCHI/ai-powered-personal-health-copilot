export type Gender = 'male' | 'female' | 'other';
export type AbhaStatus = 'verified' | 'unverified' | 'mock';

export interface Patient {
  _id?: string;
  patientId: string; // e.g. "PT-1001"
  name: string;
  dob: string | Date;
  gender: Gender;
  bloodGroup: string;
  phone?: string;
  abhaId?: string; // e.g. "91-8472-1923-0192"
  abhaStatus: AbhaStatus;
  lastSync?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PatientSummary {
  patientId: string;
  latestRecordDate: string | null;
  asOfStatement: string;
  plainLanguageSummary: string;
  abnormalFindingsCount: number;
  activeMedicationsCount: number;
  totalDocumentsCount: number;
  disclaimer: string;
}

export interface PatientListItem {
  patientId: string;
  name: string;
  dob: string | Date;
  gender: Gender;
  bloodGroup: string;
  abhaId?: string;
  abhaStatus: AbhaStatus;
  documentCount: number;
  lastRecordDate: string | null;
}
