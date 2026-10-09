import { PatientModel } from '../models/patient.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { DocumentModel } from '../models/document.model';
import { ConditionModel } from '../models/condition.model';
import { ChatSessionModel, IChatSession } from '../models/chatSession.model';
import { GeminiProvider } from '../ai/providers/gemini.provider';
import { ChatTurnSource, ChatQueryResponse } from '@health-copilot/shared';

const geminiProvider = new GeminiProvider();

export class ChatService {
  /**
   * Processes a patient query strictly grounded in their clinical record.
   * Isolates query execution to the target patientId only.
   */
  static async processMessage(
    patientId: string,
    query: string,
    requestedLanguage = 'en'
  ): Promise<ChatQueryResponse> {
    const cleanId = patientId.toUpperCase();

    // Step 1: Fetch target patient clinical data
    const [patient, observations, medications, documents, conditions] = await Promise.all([
      PatientModel.findOne({ patientId: cleanId }),
      ObservationModel.find({ patientId: cleanId }).sort({ effectiveDateTime: -1, createdAt: -1 }),
      MedicationStatementModel.find({ patientId: cleanId }),
      DocumentModel.find({ patientId: cleanId }).sort({ reportDate: -1, uploadedAt: -1 }),
      ConditionModel.find({ patientId: cleanId }),
    ]);

    if (!patient) {
      throw new Error(`Patient ${cleanId} not found in clinical registry.`);
    }

    // Step 2: Assemble grounded context string
    const contextSections: string[] = [];

    contextSections.push(`PATIENT PROFILE:
- ID: ${patient.patientId}
- Name: ${patient.name}
- Gender: ${patient.gender}
- Blood Group: ${patient.bloodGroup}
- Total Records: ${documents.length}`);

    if (observations.length > 0) {
      const obsLines = observations.map((o) => {
        const ref =
          o.referenceLow !== null && o.referenceHigh !== null
            ? `(Reference Interval: ${o.referenceLow}–${o.referenceHigh} ${o.unit || ''})`
            : '(No Reference Interval printed)';
        const dateStr = o.effectiveDateTime ? new Date(o.effectiveDateTime).toISOString().split('T')[0] : 'Date unknown';
        return `- ${o.code}: ${o.value} ${o.unit || ''} [Flag: ${o.interpretation}] ${ref} on ${dateStr}`;
      });
      contextSections.push(`LABORATORY TESTS & OBSERVATIONS (${observations.length} items):\n${obsLines.join('\n')}`);
    } else {
      contextSections.push('LABORATORY TESTS & OBSERVATIONS: None on record.');
    }

    if (medications.length > 0) {
      const medLines = medications.map(
        (m) =>
          `- Medication: ${m.medicationName} | Dosage: ${m.dosage || 'Not specified'} | Frequency: ${
            m.frequency || 'Not specified'
          } | Duration: ${m.duration || 'Not specified'} | Status: ${m.status}`
      );
      contextSections.push(`PRESCRIBED MEDICATIONS (${medications.length} items):\n${medLines.join('\n')}`);
    } else {
      contextSections.push('PRESCRIBED MEDICATIONS: None on record.');
    }

    if (documents.length > 0) {
      const docLines = documents.map(
        (d) =>
          `- Doc ID: ${d.documentId} | File: ${d.fileName} | Type: ${d.documentType} | Report Date: ${
            d.reportDate || 'Not specified'
          } | Summary: ${d.aiSummary || 'No summary'}`
      );
      contextSections.push(`DIAGNOSTIC DOCUMENTS (${documents.length} items):\n${docLines.join('\n')}`);
    }

    if (conditions.length > 0) {
      const condLines = conditions.map((c) => `- ${c.code} (${c.clinicalStatus})`);
      contextSections.push(`RECORDED CONDITIONS:\n${condLines.join('\n')}`);
    }

    const assembledContext = contextSections.join('\n\n');

    // Step 3: Run grounded LLM reasoning
    const reply = await geminiProvider.answerPatientQuery(
      assembledContext,
      query,
      requestedLanguage
    );

    // Step 4: Collect source references
    const sources: ChatTurnSource[] = documents.slice(0, 3).map((d) => ({
      documentId: d.documentId,
      reportDate: d.reportDate,
      title: d.fileName,
    }));

    // Step 5: Save message to ChatSessionModel
    let session = await ChatSessionModel.findOne({ patientId: cleanId }).sort({ updatedAt: -1 });
    if (!session) {
      session = new ChatSessionModel({
        patientId: cleanId,
        title: `Health Consultation - ${new Date().toLocaleDateString()}`,
        messages: [],
      });
    }

    session.messages.push({
      sender: 'user',
      message: query,
      language: requestedLanguage,
      timestamp: new Date(),
    });

    session.messages.push({
      sender: 'assistant',
      message: reply,
      language: requestedLanguage,
      sources,
      timestamp: new Date(),
    });

    await session.save();

    return {
      success: true,
      reply,
      disclaimer:
        'This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice.',
      sources,
      language: requestedLanguage,
    };
  }

  /**
   * Retrieves chat history for the patient.
   */
  static async getHistory(patientId: string): Promise<IChatSession | null> {
    return ChatSessionModel.findOne({ patientId: patientId.toUpperCase() }).sort({ updatedAt: -1 });
  }

  /**
   * Clears chat history for the patient.
   */
  static async clearHistory(patientId: string): Promise<void> {
    await ChatSessionModel.deleteMany({ patientId: patientId.toUpperCase() });
  }
}
