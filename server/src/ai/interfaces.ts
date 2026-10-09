import { AiExtractionOutput } from '@health-copilot/shared';

export interface OcrResult {
  rawText: string;
  confidence: number;
  detectedLanguage?: string;
  isHandwritten?: boolean;
}

export interface OcrProvider {
  name: string;
  extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult>;
}

export interface LlmProvider {
  name: string;
  extractEntities(
    rawText: string,
    fileBuffer?: Buffer,
    mimeType?: string
  ): Promise<AiExtractionOutput>;
  generatePlainSummary(
    extraction: AiExtractionOutput,
    language?: string
  ): Promise<string>;
  answerPatientQuery(
    context: string,
    query: string,
    language?: string
  ): Promise<string>;
}
