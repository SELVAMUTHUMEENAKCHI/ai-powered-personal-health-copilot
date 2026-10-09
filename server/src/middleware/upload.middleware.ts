import multer from 'multer';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// In-memory buffer storage so files can be validated and streamed to GridFS
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});

export interface FileValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  error?: string;
  sha256Hash: string;
}

export function validateFileMagicBytes(buffer: Buffer, originalName: string): FileValidationResult {
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

  if (!buffer || buffer.length < 4) {
    return {
      isValid: false,
      detectedMime: null,
      error: 'File is empty or corrupt.',
      sha256Hash,
    };
  }

  // Check Magic Bytes
  // 1. PDF: %PDF (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, detectedMime: 'application/pdf', sha256Hash };
  }

  // 2. PNG: 0x89 0x50 0x4E 0x47 (0x89 P N G)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { isValid: true, detectedMime: 'image/png', sha256Hash };
  }

  // 3. JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedMime: 'image/jpeg', sha256Hash };
  }

  // 4. DOCX: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return {
      isValid: true,
      detectedMime:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sha256Hash,
    };
  }

  // 5. Legacy DOC: 0xD0 0xCF 0x11 0xE0
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return {
      isValid: false,
      detectedMime: 'application/msword',
      error: 'Limited support for legacy DOC. Please convert to PDF or DOCX.',
      sha256Hash,
    };
  }

  return {
    isValid: false,
    detectedMime: null,
    error: `Unsupported file format (${originalName}). Supported formats: PDF, DOCX, JPG, JPEG, PNG.`,
    sha256Hash,
  };
}

export function validateUploadedFile(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FILE',
        message: 'No medical document was provided in the upload request.',
      },
    });
    return;
  }

  const result = validateFileMagicBytes(req.file.buffer, req.file.originalname);
  if (!result.isValid) {
    res.status(415).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: result.error || 'Unable to process this document. Please check the file and try again.',
      },
    });
    return;
  }

  // Attach detected MIME type and SHA-256 hash to request
  (req as Request & { fileMeta?: { mime: string; hash: string } }).fileMeta = {
    mime: result.detectedMime!,
    hash: result.sha256Hash,
  };

  next();
}
