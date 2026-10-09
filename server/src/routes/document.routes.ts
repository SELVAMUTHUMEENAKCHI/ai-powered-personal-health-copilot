import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { uploadMiddleware, validateUploadedFile } from '../middleware/upload.middleware';

const router = Router();

// Single document upload
router.post(
  '/upload',
  authenticate,
  uploadMiddleware.single('file'),
  validateUploadedFile,
  DocumentController.uploadDocument
);

// Bulk document upload (Admin only, up to 20 files)
router.post(
  '/bulk-upload',
  authenticate,
  adminOnly,
  uploadMiddleware.array('files', 20),
  DocumentController.bulkUpload
);

// Job status polling
router.get('/jobs/:jobId', authenticate, DocumentController.getJobStatus);

// List documents (scoped by authenticated patient or queryable by admin)
router.get('/', authenticate, DocumentController.listDocuments);
router.get('/patient/:patientId', authenticate, DocumentController.listDocuments);

// Get single document detail
router.get('/:documentId', authenticate, DocumentController.getDocument);

// Stream original raw file from GridFS
router.get('/:documentId/file', authenticate, DocumentController.streamDocumentFile);

// Human-in-the-loop review and correction (Admin only)
router.patch('/:documentId/review', authenticate, adminOnly, DocumentController.reviewDocument);

export default router;
