import { Request, Response, NextFunction } from 'express';
import { JobQueueService, EnqueueFileItem } from '../services/jobQueue.service';
import { DocumentModel } from '../models/document.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { GridFsService } from '../services/gridfs.service';
import { validateFileMagicBytes } from '../middleware/upload.middleware';
import { DocumentReviewSchema } from '@health-copilot/shared';

export class DocumentController {
  /**
   * Handles single medical document upload.
   * Patients are hard-scoped to their own patientId.
   */
  static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILE', message: 'No medical document was provided.' },
        });
        return;
      }

      const fileMeta = (req as Request & { fileMeta?: { mime: string; hash: string } }).fileMeta;
      if (!fileMeta) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILE', message: 'File validation metadata missing.' },
        });
        return;
      }

      // Enforce patient ID from token for patient role, or body for admin
      let targetPatientId: string | null = null;
      if (req.user?.role === 'patient') {
        targetPatientId = req.user.patientId;
      } else if (req.user?.role === 'admin') {
        targetPatientId = req.body.patientId || null;
      }

      if (!targetPatientId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PATIENT_ID',
            message: 'Target Patient ID must be specified for administrative upload.',
          },
        });
        return;
      }

      // Enqueue job for background processing
      const job = await JobQueueService.enqueueJob(
        `Single Upload: ${req.file.originalname}`,
        req.user!.userId,
        [
          {
            fileName: req.file.originalname,
            buffer: req.file.buffer,
            mimeType: fileMeta.mime,
            sha256Hash: fileMeta.hash,
            patientIdHint: targetPatientId,
            uploadedBy: req.user!.userId,
            uploadedRole: req.user!.role,
          },
        ]
      );

      res.status(202).json({
        success: true,
        message: 'Processing your medical document...',
        jobId: job.jobId,
        initialStatus: 'Queued',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Polls upload job status.
   */
  static async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const job = await JobQueueService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: `Job ${jobId} not found.` },
        });
        return;
      }

      // Check access permission: Admin or Creator
      if (req.user?.role === 'patient' && job.uploadedBy !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_ISOLATION_VIOLATION',
            message: 'Access denied: You cannot view status for another user upload job.',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        jobId: job.jobId,
        status: job.status,
        totals: {
          total: job.totalFiles,
          processed: job.processedFiles,
          success: job.successCount,
          failed: job.failedCount,
          processing: job.totalFiles - job.processedFiles,
        },
        files: job.files,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists medical documents with tenant isolation.
   */
  static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: Record<string, unknown> = {};
      const paramPatientId = req.params.patientId ? String(req.params.patientId).toUpperCase() : null;
      const queryPatientId = req.query.patientId ? String(req.query.patientId).toUpperCase() : null;
      const targetPatientId = paramPatientId || queryPatientId;

      if (req.user?.role === 'patient') {
        if (targetPatientId && targetPatientId !== req.user.patientId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'TENANT_ISOLATION_VIOLATION',
              message: 'Access denied: You cannot view medical records belonging to another patient.',
            },
          });
          return;
        }
        filter.patientId = req.user.patientId;
      } else if (targetPatientId) {
        filter.patientId = targetPatientId;
      }

      if (req.query.type) {
        filter.documentType = req.query.type;
      }

      const docs = await DocumentModel.find(filter).sort({ reportDate: -1, uploadedAt: -1 });

      res.status(200).json({
        success: true,
        total: docs.length,
        documents: docs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves single document detail with ownership checks.
   */
  static async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = String(req.params.documentId);
      const doc = await DocumentModel.findOne({ documentId });

      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Medical document not found.' },
        });
        return;
      }

      // Strict ownership check for patients
      if (req.user?.role === 'patient' && doc.patientId !== req.user.patientId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_ISOLATION_VIOLATION',
            message: 'Access denied: You do not own this medical document.',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        document: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Streams the raw binary file directly from MongoDB GridFS.
   */
  static async streamDocumentFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = String(req.params.documentId);
      const doc = await DocumentModel.findOne({ documentId });

      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Medical document not found.' },
        });
        return;
      }

      // Strict ownership check
      if (req.user?.role === 'patient' && doc.patientId !== req.user.patientId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_ISOLATION_VIOLATION',
            message: 'Access denied: You do not own this medical document.',
          },
        });
        return;
      }

      res.setHeader('Content-Type', doc.fileType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);

      const stream = GridFsService.downloadStream(doc.storageRef);
      stream.on('error', (err) => {
        console.error('[GridFS] Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: { code: 'STREAM_ERROR', message: 'Failed to retrieve file from storage.' },
          });
        }
      });

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handles multi-file bulk document upload (Admin only, up to 20 files).
   * Automatically parses patient ID from filename (e.g. PT-1001_report.pdf)
   * and isolates failures per file.
   */
  static async bulkUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FILES', message: 'No documents provided for bulk ingestion.' },
        });
        return;
      }

      if (files.length > 20) {
        res.status(400).json({
          success: false,
          error: { code: 'TOO_MANY_FILES', message: 'Maximum 20 documents allowed per bulk batch.' },
        });
        return;
      }

      const enqueueItems: EnqueueFileItem[] = files.map((file) => {
        const validation = validateFileMagicBytes(file.buffer, file.originalname);
        const match = file.originalname.match(/^(PT-\d+)/i);
        const patientIdHint = match ? match[1].toUpperCase() : null;

        return {
          fileName: file.originalname,
          buffer: file.buffer,
          mimeType: validation.isValid ? validation.detectedMime! : 'application/octet-stream',
          sha256Hash: validation.sha256Hash,
          patientIdHint,
          uploadedBy: req.user!.userId,
          uploadedRole: req.user!.role,
        };
      });

      const job = await JobQueueService.enqueueJob(
        `Bulk Ingestion: ${files.length} documents`,
        req.user!.userId,
        enqueueItems
      );

      res.status(202).json({
        success: true,
        message: 'Bulk upload job enqueued successfully.',
        jobId: job.jobId,
        totalFiles: files.length,
        status: 'queued',
        pollUrl: `/api/documents/jobs/${job.jobId}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Allows administrator to review and correct AI-extracted parameters.
   * Updates Document record and synchronizes underlying Observation and Medication models.
   */
  static async reviewDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = String(req.params.documentId);
      const doc = await DocumentModel.findOne({ documentId });

      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: `Medical document ${documentId} not found.` },
        });
        return;
      }

      const validated = DocumentReviewSchema.parse(req.body);

      if (validated.reportDate !== undefined) {
        doc.reportDate = validated.reportDate;
      }
      if (validated.documentType !== undefined) {
        doc.documentType = validated.documentType;
      }
      if (validated.aiSummary !== undefined) {
        doc.aiSummary = validated.aiSummary;
      }
      if (validated.medicines !== undefined) {
        doc.medicines = validated.medicines;
      }
      if (validated.abnormalFindings !== undefined) {
        doc.abnormalFindings = validated.abnormalFindings as typeof doc.abnormalFindings;
      }
      if (validated.explicitDiagnoses !== undefined) {
        doc.explicitDiagnoses = validated.explicitDiagnoses;
      }
      doc.adminReviewed = true;

      await doc.save();

      // Synchronize Observations if abnormal findings provided
      if (validated.abnormalFindings) {
        await ObservationModel.deleteMany({ documentId: doc.documentId });
        const obsToInsert = validated.abnormalFindings.map((f) => ({
          resourceType: 'Observation',
          patientId: doc.patientId,
          documentId: doc.documentId,
          code: f.testName,
          value: f.value,
          unit: f.unit,
          referenceLow: f.referenceRange?.low ?? null,
          referenceHigh: f.referenceRange?.high ?? null,
          interpretation: f.interpretation,
          plainLanguageNote: f.plainLanguageNote,
          effectiveDateTime: doc.reportDate ? new Date(doc.reportDate) : null,
          issued: new Date(),
        }));
        if (obsToInsert.length > 0) {
          await ObservationModel.insertMany(obsToInsert);
        }
      }

      // Synchronize Medications if medicines provided
      if (validated.medicines) {
        await MedicationStatementModel.deleteMany({ documentId: doc.documentId });
        const medsToInsert = validated.medicines.map((m) => ({
          resourceType: 'MedicationStatement',
          patientId: doc.patientId,
          documentId: doc.documentId,
          medicationName: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
          status: 'active',
          confidence: m.confidence,
        }));
        if (medsToInsert.length > 0) {
          await MedicationStatementModel.insertMany(medsToInsert);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Document reviewed and verified successfully.',
        document: doc,
      });
    } catch (err) {
      next(err);
    }
  }
}

