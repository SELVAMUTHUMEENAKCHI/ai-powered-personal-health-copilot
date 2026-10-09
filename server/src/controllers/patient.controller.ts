import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patient.service';
import { FhirService } from '../services/fhir.service';
import { TrendsService } from '../services/trends.service';
import { PatientModel } from '../models/patient.model';
import { UserModel } from '../models/user.model';

export class PatientController {
  static async listPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.query as string) || '';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await PatientService.searchPatients(query, limit, page);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const patient = await PatientService.getPatientById(targetId);

      if (!patient) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: `Patient ${targetId} was not found.`,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        patient,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const summary = await PatientService.getPatientSummary(targetId);

      res.status(200).json({
        success: true,
        summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates and returns ABDM-compliant HL7 FHIR R4 Bundle.
   */
  static async exportFhirBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const bundle = await FhirService.generatePatientBundle(targetId);

      if (req.query.download === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${targetId.toUpperCase()}-fhir-r4-bundle.json"`
        );
      }

      res.status(200).json(bundle);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves longitudinal biomarker trend points for Recharts.
   */
  static async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const trends = await TrendsService.getBiomarkerTrends(targetId);

      res.status(200).json({
        success: true,
        patientId: targetId.toUpperCase(),
        trends,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves active and completed patient medications.
   */
  static async getMedications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const medications = await TrendsService.getPatientMedications(targetId);

      res.status(200).json({
        success: true,
        patientId: targetId.toUpperCase(),
        medications,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves calendar timeline events.
   */
  static async getCalendarEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId);
      const events = await TrendsService.getCalendarEvents(targetId);

      res.status(200).json({
        success: true,
        patientId: targetId.toUpperCase(),
        events,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates patient profile details.
   */
  static async updatePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetId = String(req.scopedPatientId || req.params.patientId).toUpperCase();
      const { name, phone, dob, gender, bloodGroup, preferredLanguage } = req.body;

      const patient = await PatientModel.findOne({ patientId: targetId });
      if (!patient) {
        res.status(404).json({
          success: false,
          error: { code: 'PATIENT_NOT_FOUND', message: `Patient ${targetId} was not found.` },
        });
        return;
      }

      if (name) patient.name = name.trim();
      if (phone !== undefined) patient.phone = phone.trim() || undefined;
      if (dob) patient.dob = new Date(dob);
      if (gender) patient.gender = gender;
      if (bloodGroup) patient.bloodGroup = bloodGroup;
      await patient.save();

      // Also update linked User record if exists
      if (req.user?.userId) {
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          if (name) user.name = name.trim();
          if (preferredLanguage) user.preferredLanguage = preferredLanguage;
          await user.save();
        }
      }

      res.status(200).json({
        success: true,
        message: 'Patient profile updated successfully.',
        patient,
      });
    } catch (err) {
      next(err);
    }
  }
}
