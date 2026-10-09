import mongoose from 'mongoose';
import { DocumentModel } from '../models/document.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { DiagnosticReportModel } from '../models/diagnosticReport.model';
import { ConditionModel } from '../models/condition.model';
import { OcrProvider, LlmProvider } from './interfaces';
import { GeminiProvider } from './providers/gemini.provider';
import { TesseractProvider } from './providers/tesseract.provider';
import { normalizeDate } from './normalizer/dateNormalizer';
import { normalizeUnit } from './normalizer/unitNormalizer';
import { processAbnormalFindings, evaluateTestValue } from './rules/rangeEvaluator';

export class MedicalAiPipeline {
  private ocrProvider: OcrProvider;
  private fallbackOcr: OcrProvider;
  private llmProvider: LlmProvider;

  constructor() {
    const gemini = new GeminiProvider();
    this.ocrProvider = gemini;
    this.fallbackOcr = new TesseractProvider();
    this.llmProvider = gemini;
  }

  /**
   * Processes a document through the modular AI stages.
   */
  async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    onStatusChange?: (status: string) => Promise<void>
  ): Promise<void> {
    const doc = await DocumentModel.findOne({ documentId });
    if (!doc) {
      throw new Error(`Document ${documentId} not found in database.`);
    }

    try {
      // Stage 1: OCR Processing
      await this.updateStatus(doc, 'OCR Processing', onStatusChange);
      let ocrResult = await this.ocrProvider.extractText(fileBuffer, mimeType).catch(async (err) => {
        console.warn(`[Pipeline] Primary OCR failed, falling back to Tesseract: ${err.message}`);
        return this.fallbackOcr.extractText(fileBuffer, mimeType);
      });

      doc.ocrText = ocrResult.rawText;
      await doc.save();

      // Stage 2: Entity Extraction via LLM
      await this.updateStatus(doc, 'Extracting', onStatusChange);
      const extraction = await this.llmProvider.extractEntities(
        ocrResult.rawText,
        fileBuffer,
        mimeType
      );

      // Stage 3 & 4: Normalization & Validation
      await this.updateStatus(doc, 'Validating', onStatusChange);
      const normalizedReportDate = normalizeDate(extraction.reportDate);
      doc.reportDate = normalizedReportDate;
      doc.documentType = extraction.documentType;
      doc.rawExtraction = extraction;

      // Normalize tests & units
      const normalizedTests = extraction.tests.map((t) => ({
        name: t.name.trim(),
        value: t.value,
        unit: normalizeUnit(t.unit),
        referenceRange: t.referenceRange
          ? {
              low: t.referenceRange.low,
              high: t.referenceRange.high,
              rawText: t.referenceRange.rawText || null,
            }
          : null,
      }));

      // Stage 5: Deterministic Range Evaluation (Code logic only!)
      const abnormalFindings = processAbnormalFindings(normalizedTests);
      doc.abnormalFindings = abnormalFindings;

      // Medicines
      doc.medicines = extraction.medicines.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        confidence: m.confidence || 'high',
        startDate: m.startDate || normalizedReportDate,
        endDate: m.endDate || null,
      }));

      // Explicit diagnoses
      doc.explicitDiagnoses = extraction.explicitDiagnoses.map(
        (d) => `${d} (mentioned in uploaded document)`
      );

      // Stage 6: Plain-Language Summary with Non-Diagnostic Guardrails
      await this.updateStatus(doc, 'Saved', onStatusChange);
      const plainSummary = await this.llmProvider.generatePlainSummary(extraction);
      doc.aiSummary = plainSummary;

      // Stage 7: Persist FHIR clinical resources
      await this.createClinicalResources(doc, normalizedTests);

      // Final Stage: Completed
      doc.processingStatus = 'Completed';
      doc.errorReason = null;
      await doc.save();

      if (onStatusChange) {
        await onStatusChange('Completed');
      }
      console.log(`[Pipeline] Document ${documentId} processed successfully.`);
    } catch (err) {
      console.error(`[Pipeline] Document ${documentId} failed:`, err);
      doc.processingStatus = 'Failed';
      doc.errorReason =
        (err as Error).message ||
        'Unable to process this document. Please check the file and try again.';
      await doc.save();

      if (onStatusChange) {
        await onStatusChange('Failed');
      }
      throw err;
    }
  }

  private async updateStatus(
    doc: InstanceType<typeof DocumentModel>,
    status: InstanceType<typeof DocumentModel>['processingStatus'],
    onStatusChange?: (status: string) => Promise<void>
  ): Promise<void> {
    doc.processingStatus = status;
    await doc.save();
    if (onStatusChange) {
      await onStatusChange(status);
    }
  }

  private async createClinicalResources(
    doc: InstanceType<typeof DocumentModel>,
    tests: Array<{
      name: string;
      value: number | string;
      unit: string | null;
      referenceRange: { low: number | null; high: number | null } | null;
    }>
  ): Promise<void> {
    const observationIds: mongoose.Types.ObjectId[] = [];
    const reportDate = doc.reportDate ? new Date(doc.reportDate) : null;

    // 1. Create Observations
    for (const test of tests) {
      const interp = evaluateTestValue(test.value, test.referenceRange);
      const obs = await ObservationModel.create({
        patientId: doc.patientId,
        documentId: doc.documentId,
        code: test.name,
        value: test.value,
        unit: test.unit,
        referenceLow: test.referenceRange?.low ?? null,
        referenceHigh: test.referenceRange?.high ?? null,
        interpretation: interp,
        effectiveDateTime: reportDate,
        issued: doc.uploadedAt,
      });
      observationIds.push(obs._id as mongoose.Types.ObjectId);
    }

    // 2. Create DiagnosticReport if tests exist
    if (observationIds.length > 0) {
      await DiagnosticReportModel.create({
        patientId: doc.patientId,
        documentId: doc.documentId,
        code: doc.fileName,
        status: 'final',
        effectiveDateTime: reportDate,
        conclusion: doc.aiSummary,
        resultObservationIds: observationIds,
      });
    }

    // 3. Create MedicationStatements
    for (const med of doc.medicines) {
      await MedicationStatementModel.create({
        patientId: doc.patientId,
        documentId: doc.documentId,
        medicationName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
        status: 'active',
        confidence: med.confidence,
        startDate: reportDate,
      });
    }

    // 4. Create Conditions for explicit diagnoses
    for (const diag of doc.explicitDiagnoses) {
      await ConditionModel.create({
        patientId: doc.patientId,
        documentId: doc.documentId,
        code: diag,
        clinicalStatus: 'active',
        recordedDate: reportDate,
        note: diag,
      });
    }
  }
}
