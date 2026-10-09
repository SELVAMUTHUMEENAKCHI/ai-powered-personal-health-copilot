import { PatientModel, IPatient } from '../models/patient.model';
import { DocumentModel } from '../models/document.model';
import { MedicationStatementModel } from '../models/medication.model';
import { ObservationModel } from '../models/observation.model';
import { PatientSummary } from '@health-copilot/shared';

export class PatientService {
  static async getPatientById(patientId: string): Promise<IPatient | null> {
    return PatientModel.findOne({ patientId: patientId.toUpperCase() });
  }

  static async searchPatients(query?: string, limit = 20, page = 1) {
    const filter: Record<string, unknown> = {};
    if (query) {
      filter.$or = [
        { patientId: new RegExp(query, 'i') },
        { name: new RegExp(query, 'i') },
        { abhaId: new RegExp(query, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const [patients, total] = await Promise.all([
      PatientModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PatientModel.countDocuments(filter),
    ]);

    // Attach document count and last record date for list display
    const enriched = await Promise.all(
      patients.map(async (p) => {
        const [docCount, lastDoc] = await Promise.all([
          DocumentModel.countDocuments({ patientId: p.patientId }),
          DocumentModel.findOne({ patientId: p.patientId }).sort({ reportDate: -1, uploadedAt: -1 }),
        ]);

        return {
          patientId: p.patientId,
          name: p.name,
          dob: p.dob,
          gender: p.gender,
          bloodGroup: p.bloodGroup,
          abhaId: p.abhaId,
          abhaStatus: p.abhaStatus,
          documentCount: docCount,
          lastRecordDate: lastDoc?.reportDate || lastDoc?.uploadedAt?.toISOString() || null,
        };
      })
    );

    return { total, patients: enriched, page, limit };
  }

  static async getPatientSummary(patientId: string): Promise<PatientSummary> {
    const cleanId = patientId.toUpperCase();
    const patient = await PatientModel.findOne({ patientId: cleanId });
    if (!patient) {
      const err = new Error(`Patient ${patientId} not found.`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    const [totalDocs, latestDoc, abnormalCount, activeMedsCount] = await Promise.all([
      DocumentModel.countDocuments({ patientId: cleanId }),
      DocumentModel.findOne({ patientId: cleanId, processingStatus: 'Completed' }).sort({
        reportDate: -1,
        uploadedAt: -1,
      }),
      ObservationModel.countDocuments({
        patientId: cleanId,
        interpretation: { $in: ['HIGH', 'LOW'] },
      }),
      MedicationStatementModel.countDocuments({
        patientId: cleanId,
        status: 'active',
      }),
    ]);

    const latestDate = latestDoc?.reportDate || (latestDoc?.uploadedAt ? latestDoc.uploadedAt.toISOString().split('T')[0] : null);

    const asOfStatement = latestDate
      ? `Based on your available records up to ${new Date(latestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      : 'No recent record is available';

    const plainSummary = latestDoc?.aiSummary
      ? latestDoc.aiSummary
      : totalDocs === 0
      ? 'No medical records available yet. Upload your first document to get started.'
      : 'Information not available in the uploaded records.';

    return {
      patientId: cleanId,
      latestRecordDate: latestDate,
      asOfStatement,
      plainLanguageSummary: plainSummary,
      abnormalFindingsCount: abnormalCount,
      activeMedicationsCount: activeMedsCount,
      totalDocumentsCount: totalDocs,
      disclaimer:
        'This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice.',
    };
  }
}
