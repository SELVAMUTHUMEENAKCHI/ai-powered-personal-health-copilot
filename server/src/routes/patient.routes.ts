import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { enforcePatientIsolation } from '../middleware/isolation.middleware';

const router = Router();

// Admin-only patient search and listing
router.get('/', authenticate, adminOnly, PatientController.listPatients);

// Patient profile and health summary (protected with strict patient isolation)
router.get('/:patientId', authenticate, enforcePatientIsolation, PatientController.getPatient);
router.patch('/:patientId', authenticate, enforcePatientIsolation, PatientController.updatePatient);
router.get('/:patientId/summary', authenticate, enforcePatientIsolation, PatientController.getSummary);

// ABDM-Ready HL7 FHIR R4 Bundle Exporter
router.get('/:patientId/fhir-bundle', authenticate, enforcePatientIsolation, PatientController.exportFhirBundle);

// Longitudinal biomarker observation trends (Recharts)
router.get('/:patientId/trends', authenticate, enforcePatientIsolation, PatientController.getTrends);

// Structured patient medications & treatments
router.get('/:patientId/medications', authenticate, enforcePatientIsolation, PatientController.getMedications);

// Health timeline calendar events
router.get('/:patientId/calendar', authenticate, enforcePatientIsolation, PatientController.getCalendarEvents);

export default router;
