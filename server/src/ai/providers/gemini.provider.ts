import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { OcrProvider, LlmProvider, OcrResult } from '../interfaces';
import { AiExtractionOutput, AiExtractionOutputSchema } from '@health-copilot/shared';
import { MEDICAL_EXTRACTION_SYSTEM_PROMPT } from '../prompts/extractionPrompt';
import { CLINICAL_SUMMARY_SYSTEM_PROMPT, formatSafeSummary } from '../prompts/summaryPrompt';

export class GeminiProvider implements OcrProvider, LlmProvider {
  name = 'Gemini 2.5 Flash Multimodal';
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'mock_dev_key_for_offline_testing') {
      try {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      } catch (err) {
        console.warn('[GeminiProvider] Initialization warning:', err);
      }
    }
  }

  /**
   * Performs multimodal OCR and transcription using Gemini Vision.
   */
  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!this.ai) {
      return {
        rawText: `[Offline/Mock OCR] Processed file buffer of size ${fileBuffer.length} bytes.`,
        confidence: 0.9,
      };
    }

    try {
      const base64Data = fileBuffer.toString('base64');
      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: 'Extract and transcribe all text from this medical document accurately, including doctor handwriting, dates, lab test tables, and prescriptions. Preserve exact numbers and units.',
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      return {
        rawText: text,
        confidence: 0.95,
        isHandwritten: text.toLowerCase().includes('rx') || text.toLowerCase().includes('tab'),
      };
    } catch (err) {
      console.error('[GeminiProvider] OCR Error:', err);
      throw err;
    }
  }

  /**
   * Extracts structured clinical entities into strict JSON adhering to AiExtractionOutputSchema.
   */
  async extractEntities(
    rawText: string,
    fileBuffer?: Buffer,
    mimeType?: string
  ): Promise<AiExtractionOutput> {
    if (!this.ai) {
      // Mock / Offline fallback parser for deterministic tests & offline development
      return this.fallbackParse(rawText);
    }

    try {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: MEDICAL_EXTRACTION_SYSTEM_PROMPT },
      ];

      if (fileBuffer && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: fileBuffer.toString('base64'),
          },
        });
      }

      parts.push({
        text: `Analyze the document and extract structured entities adhering to the JSON schema. Document text:\n\n${rawText}`,
      });

      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      const parsedJson = JSON.parse(responseText);

      // Validate through Zod to guarantee schema compliance and strip any hallucinated keys
      return AiExtractionOutputSchema.parse(parsedJson);
    } catch (err) {
      console.warn('[GeminiProvider] LLM entity extraction fallback due to:', (err as Error).message);
      return this.fallbackParse(rawText);
    }
  }

  /**
   * Generates a plain-language summary for the patient.
   */
  async generatePlainSummary(
    extraction: AiExtractionOutput,
    language = 'en'
  ): Promise<string> {
    if (!this.ai) {
      return formatSafeSummary(
        `This report contains ${extraction.tests.length} laboratory test(s) and ${extraction.medicines.length} medication(s).`
      );
    }

    try {
      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: CLINICAL_SUMMARY_SYSTEM_PROMPT },
              {
                text: `Generate an empathetic, layman summary in language code "${language}" for the following extracted medical data:\n${JSON.stringify(
                  extraction,
                  null,
                  2
                )}`,
              },
            ],
          },
        ],
      });

      return formatSafeSummary(response.text || 'Document analyzed successfully.');
    } catch {
      return formatSafeSummary(
        `This report contains ${extraction.tests.length} laboratory test(s) and ${extraction.medicines.length} medication(s).`
      );
    }
  }

  /**
   * Answers a patient query strictly grounded in their clinical record.
   * Handles bilingual, colloquial, and Thanglish queries.
   */
  async answerPatientQuery(
    context: string,
    query: string,
    language = 'en'
  ): Promise<string> {
    if (!this.ai) {
      // Smart offline fallback: scan context for query keywords
      const queryLower = query.toLowerCase();
      const lines = context.split('\n');
      const matchedLines = lines.filter((line) => {
        const lineLower = line.toLowerCase();
        if (queryLower.includes('sugar') || queryLower.includes('glucose')) {
          return lineLower.includes('sugar') || lineLower.includes('glucose');
        }
        if (queryLower.includes('med') || queryLower.includes('tablet') || queryLower.includes('prescription')) {
          return lineLower.includes('medication:') || lineLower.includes('tablet');
        }
        if (queryLower.includes('abnormal') || queryLower.includes('high') || queryLower.includes('low')) {
          return lineLower.includes('[flag: high]') || lineLower.includes('[flag: low]');
        }
        return false;
      });

      if (matchedLines.length > 0) {
        return formatSafeSummary(
          `Based on your available records:\n${matchedLines.join('\n')}\n\nPlease discuss these findings with your qualified healthcare provider.`
        );
      }

      return formatSafeSummary(
        `Based on your records:\n${context.substring(0, 400)}...\n\nPlease discuss your specific questions with your doctor.`
      );
    }

    try {
      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the AI Personal Health Copilot for this patient.
CRITICAL SAFETY & GROUNDING RULES:
1. You MUST answer the patient query STRICTLY and EXCLUSIVELY based on the medical records provided in the context below.
2. NEVER diagnose diseases or recommend treatments/prescription changes.
3. If the user asks about a test, symptom, medicine, or fact NOT found in the context, clearly answer: "Information not available in the uploaded records."
4. BILINGUAL & COLLOQUIAL HANDLING:
   - The user may ask in English, Tamil, Hindi, Telugu, Malayalam, or colloquial Thanglish (Tamil+English, e.g. "Enoda fasting sugar report la normal ah?", "Meds list sollu", "BP evalo iruku?").
   - Respond in the matching language / tone requested (if asked in Tamil or Thanglish, provide an empathetic explanation in Tamil/Thanglish with English medical terms kept clear).
5. Always structure your response clearly using bullet points for tests, values, and medications.
6. Target Language: "${language}".

Patient Clinical Context:
${context}`,
              },
              { text: `Patient Query: ${query}` },
            ],
          },
        ],
      });

      return formatSafeSummary(response.text || 'Unable to analyze query from the available records.');
    } catch {
      return formatSafeSummary('Information not available in the uploaded records.');
    }
  }

  /**
   * Deterministic regex-based fallback parser for development and offline mode.
   */
  private fallbackParse(text: string): AiExtractionOutput {
    const lines = text.split('\n');
    let reportDate: string | null = null;
    const medicines: AiExtractionOutput['medicines'] = [];
    const tests: AiExtractionOutput['tests'] = [];

    // Simple date regex: YYYY-MM-DD or DD/MM/YYYY
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}[/-]\d{1,2}[/-]\d{4})/);
    if (dateMatch) {
      reportDate = dateMatch[0];
    }

    for (const line of lines) {
      // Look for lab tests like: Glucose Fasting 134 mg/dL 70-100
      const testMatch = line.match(/([a-zA-Z\s]+)\s+(\d+(\.\d+)?)\s*(mg\/dL|g\/dL|mmol\/L|U\/L)?\s*\(?(\d+(\.\d+)?)\s*[-–]\s*(\d+(\.\d+)?)\)?/i);
      if (testMatch) {
        tests.push({
          name: testMatch[1].trim(),
          value: parseFloat(testMatch[2]),
          unit: testMatch[4] || null,
          referenceRange: {
            low: parseFloat(testMatch[5]),
            high: parseFloat(testMatch[7]),
            rawText: `${testMatch[5]}-${testMatch[7]}`,
          },
        });
      }

      // Look for prescriptions like: Tab Paracetamol 650mg 1-0-1 5 days
      const medMatch = line.match(/(?:Tab|Cap|Syr|Tablet)?\s*([a-zA-Z]+)\s+(\d+mg|\d+g)?/i);
      if (medMatch && medMatch[1].length > 3 && !line.includes('Date') && !line.includes('Report')) {
        medicines.push({
          name: medMatch[1].trim(),
          dosage: medMatch[2] || null,
          frequency: line.includes('1-0-1') ? 'Twice daily' : line.includes('1-1-1') ? 'Thrice daily' : null,
          duration: line.includes('days') ? line.match(/\d+\s*days/i)?.[0] || null : null,
          instructions: null,
          confidence: 'high',
          startDate: null,
          endDate: null,
        });
      }
    }

    return {
      patientName: null,
      patientIdHint: null,
      reportDate,
      documentType: tests.length > 0 ? 'lab_report' : medicines.length > 0 ? 'prescription' : 'other',
      medicines,
      tests,
      explicitDiagnoses: [],
      clinicalImpression: null,
    };
  }
}
