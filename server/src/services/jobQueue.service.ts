import { UploadJobModel, IUploadJob } from '../models/uploadJob.model';
import { DocumentModel } from '../models/document.model';
import { PatientModel } from '../models/patient.model';
import { MedicalAiPipeline } from '../ai/pipeline';
import { GridFsService } from './gridfs.service';

export interface EnqueueFileItem {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  sha256Hash: string;
  patientIdHint?: string | null;
  uploadedBy: string;
  uploadedRole: 'admin' | 'patient';
}

export class JobQueueService {
  private static pipeline = new MedicalAiPipeline();

  /**
   * Creates a new UploadJob record and kicks off asynchronous background processing.
   */
  static async enqueueJob(
    batchName: string,
    uploadedBy: string,
    files: EnqueueFileItem[]
  ): Promise<IUploadJob> {
    const jobId = `JOB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialFileStatuses = files.map((f) => ({
      fileName: f.fileName,
      patientId: f.patientIdHint || undefined,
      documentId: null,
      status: 'Queued' as const,
      errorReason: null,
    }));

    const job = await UploadJobModel.create({
      jobId,
      batchName,
      uploadedBy,
      totalFiles: files.length,
      processedFiles: 0,
      successCount: 0,
      failedCount: 0,
      status: 'queued',
      files: initialFileStatuses,
    });

    // Run processing asynchronously without blocking the HTTP response
    setImmediate(() => {
      this.processJobBatch(jobId, files).catch((err) => {
        console.error(`[JobQueue] Fatal error on batch ${jobId}:`, err);
      });
    });

    return job;
  }

  /**
   * Processes all files in the batch sequentially. Isolates per-file failures so one corrupt file never halts the batch.
   */
  private static async processJobBatch(jobId: string, files: EnqueueFileItem[]): Promise<void> {
    const job = await UploadJobModel.findOne({ jobId });
    if (!job) return;

    job.status = 'in_progress';
    await job.save();

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      const fileEntry = job.files[i];

      try {
        // Step 1: Resolve Patient ID
        let targetPatientId = fileItem.patientIdHint;

        // In bulk batches, filenames are formatted like PT-1001_blood_report.pdf
        if (!targetPatientId) {
          const match = fileItem.fileName.match(/^(PT-\d+)/i);
          if (match) {
            targetPatientId = match[1].toUpperCase();
          }
        }

        if (!targetPatientId) {
          throw new Error(`Could not determine Patient ID from filename (${fileItem.fileName}). Expected PT-XXXX_filename.`);
        }

        // Verify patient exists
        const patient = await PatientModel.findOne({ patientId: targetPatientId });
        if (!patient) {
          throw new Error(`Patient ${targetPatientId} does not exist in registry.`);
        }

        fileEntry.patientId = targetPatientId;

        // Step 2: Check for Duplicate File (SHA-256 hash)
        const existingDoc = await DocumentModel.findOne({
          patientId: targetPatientId,
          fileHash: fileItem.sha256Hash,
        });

        if (existingDoc) {
          fileEntry.status = 'Completed';
          fileEntry.documentId = existingDoc.documentId;
          fileEntry.errorReason = 'Duplicate file: Already processed and indexed.';
          job.processedFiles += 1;
          job.successCount += 1;
          await job.save();
          continue;
        }

        // Step 3: Stream buffer into GridFS
        const storageRef = await GridFsService.uploadBuffer(
          fileItem.buffer,
          fileItem.fileName,
          fileItem.mimeType
        );

        // Step 4: Create Document record
        const documentId = `DOC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        fileEntry.documentId = documentId;

        await DocumentModel.create({
          documentId,
          patientId: targetPatientId,
          patientName: patient.name,
          fileName: fileItem.fileName,
          fileType: fileItem.mimeType,
          storageRef,
          fileHash: fileItem.sha256Hash,
          uploadedAt: new Date(),
          uploadedBy: fileItem.uploadedBy,
          uploadedRole: fileItem.uploadedRole,
          reportDate: null,
          documentType: 'other',
          aiSummary: null,
          abnormalFindings: [],
          medicines: [],
          explicitDiagnoses: [],
          processingStatus: 'Queued',
          errorReason: null,
          adminReviewed: false,
        });

        // Step 5: Execute Modular AI Pipeline
        await this.pipeline.processDocument(
          documentId,
          fileItem.buffer,
          fileItem.mimeType,
          async (stageStatus) => {
            fileEntry.status = stageStatus as typeof fileEntry.status;
            await job.save();
          }
        );

        fileEntry.status = 'Completed';
        fileEntry.errorReason = null;
        job.processedFiles += 1;
        job.successCount += 1;
      } catch (fileErr) {
        console.error(`[JobQueue] Error processing ${fileItem.fileName}:`, fileErr);
        fileEntry.status = 'Failed';
        fileEntry.errorReason = (fileErr as Error).message || 'Processing failed.';
        job.processedFiles += 1;
        job.failedCount += 1;
      }

      await job.save();
    }

    job.status = job.failedCount === job.totalFiles ? 'failed' : 'completed';
    await job.save();
    console.log(`[JobQueue] Batch ${jobId} finished: ${job.successCount} succeeded, ${job.failedCount} failed.`);
  }

  static async getJobStatus(jobId: string): Promise<IUploadJob | null> {
    return UploadJobModel.findOne({ jobId });
  }
}
