import { z } from 'zod';

export const ExtractedMedicineSchema = z.object({
  name: z.string(),
  dosage: z.string().nullable().default(null),
  frequency: z.string().nullable().default(null),
  duration: z.string().nullable().default(null),
  instructions: z.string().nullable().default(null),
  confidence: z.enum(['high', 'low']).default('high'),
  startDate: z.string().nullable().optional().default(null),
  endDate: z.string().nullable().optional().default(null),
});

export const ReferenceRangeSchema = z.object({
  low: z.number().nullable().default(null),
  high: z.number().nullable().default(null),
  rawText: z.string().nullable().optional().default(null),
});

export const ExtractedLabTestSchema = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().nullable().default(null),
  referenceRange: ReferenceRangeSchema.nullable().default(null),
});

export const AiExtractionOutputSchema = z.object({
  patientName: z.string().nullable().default(null),
  patientIdHint: z.string().nullable().default(null),
  reportDate: z.string().nullable().default(null), // Expected YYYY-MM-DD
  documentType: z.enum(['lab_report', 'prescription', 'discharge_summary', 'other']).default('other'),
  medicines: z.array(ExtractedMedicineSchema).default([]),
  tests: z.array(ExtractedLabTestSchema).default([]),
  explicitDiagnoses: z.array(z.string()).default([]),
  clinicalImpression: z.string().nullable().default(null),
});

export const DocumentReviewSchema = z.object({
  reportDate: z.string().nullable().optional(),
  documentType: z.enum(['lab_report', 'prescription', 'discharge_summary', 'other']).optional(),
  aiSummary: z.string().nullable().optional(),
  medicines: z.array(ExtractedMedicineSchema).optional(),
  abnormalFindings: z
    .array(
      z.object({
        testName: z.string(),
        value: z.union([z.number(), z.string()]),
        unit: z.string().nullable().default(null),
        referenceRange: ReferenceRangeSchema.nullable().default(null),
        interpretation: z.enum(['NORMAL', 'HIGH', 'LOW', 'UNSPECIFIED']).default('UNSPECIFIED'),
        plainLanguageNote: z.string().default(''),
      })
    )
    .optional(),
  explicitDiagnoses: z.array(z.string()).optional(),
  adminReviewed: z.boolean().default(true),
});

export type DocumentReviewInput = z.infer<typeof DocumentReviewSchema>;
export type AiExtractionOutput = z.infer<typeof AiExtractionOutputSchema>;
