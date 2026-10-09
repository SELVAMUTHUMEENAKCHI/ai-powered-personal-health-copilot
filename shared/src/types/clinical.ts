import { Interpretation } from './document';

export interface ObservationResource {
  _id?: string;
  resourceType: 'Observation';
  patientId: string;
  documentId: string;
  code: string; // e.g. "Glucose Fasting"
  value: number | string;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  interpretation: Interpretation;
  plainLanguageNote?: string;
  effectiveDateTime: string | Date | null;
  issued: string | Date;
}

export interface MedicationStatementResource {
  _id?: string;
  resourceType: 'MedicationStatement';
  patientId: string;
  documentId: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status: 'active' | 'completed' | 'stopped' | 'unknown';
  confidence: 'high' | 'low';
}

export interface DiagnosticReportResource {
  _id?: string;
  resourceType: 'DiagnosticReport';
  patientId: string;
  documentId: string;
  code: string;
  status: 'final' | 'preliminary';
  effectiveDateTime: string | Date | null;
  conclusion: string | null;
  resultObservationIds: string[];
}

export interface ConditionResource {
  _id?: string;
  resourceType: 'Condition';
  patientId: string;
  documentId: string;
  code: string;
  clinicalStatus: 'active' | 'resolved' | 'remission';
  recordedDate: string | Date | null;
  note: string;
}

export interface EncounterResource {
  _id?: string;
  resourceType: 'Encounter';
  patientId: string;
  documentId: string;
  serviceProvider?: string;
  doctorName?: string;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  reasonCode?: string;
}

export interface ChatTurnSource {
  documentId: string;
  reportDate?: string | null;
  title?: string;
}

export interface ChatMessageItem {
  id?: string;
  sender: 'user' | 'assistant';
  message: string;
  language: string;
  sources?: ChatTurnSource[];
  timestamp: string | Date;
}

export interface ChatQueryRequest {
  message: string;
  language?: string;
  patientId?: string;
}

export interface ChatQueryResponse {
  success: boolean;
  reply: string;
  disclaimer: string;
  sources: ChatTurnSource[];
  language: string;
}
