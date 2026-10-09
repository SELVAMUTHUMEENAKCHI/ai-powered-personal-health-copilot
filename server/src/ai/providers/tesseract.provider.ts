import { createWorker } from 'tesseract.js';
import { OcrProvider, OcrResult } from '../interfaces';

export class TesseractProvider implements OcrProvider {
  name = 'Tesseract.js Local Fallback';

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    // Tesseract directly handles raster images (PNG, JPEG)
    if (!mimeType.startsWith('image/')) {
      return {
        rawText: `[Tesseract] Non-image file (${mimeType}) skipped for local OCR.`,
        confidence: 0.5,
      };
    }

    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(fileBuffer);
      await worker.terminate();

      return {
        rawText: ret.data.text,
        confidence: ret.data.confidence / 100,
        isHandwritten: false,
      };
    } catch (err) {
      console.warn('[TesseractProvider] OCR error:', (err as Error).message);
      return {
        rawText: '',
        confidence: 0,
      };
    }
  }
}
