import { ObservationModel } from '../models/observation.model';
import { DocumentModel } from '../models/document.model';
import { MedicationStatementModel } from '../models/medication.model';

export interface BiomarkerTrendPoint {
  date: string;
  value: number;
  unit: string | null;
  interpretation: 'HIGH' | 'LOW' | 'NORMAL' | 'UNSPECIFIED';
  referenceLow: number | null;
  referenceHigh: number | null;
  documentId: string;
  documentName?: string;
}

export interface BiomarkerTrendGroup {
  testName: string;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  hasEnoughData: boolean; // true if >= 2 points
  latestValue: number;
  latestDate: string;
  latestInterpretation: 'HIGH' | 'LOW' | 'NORMAL' | 'UNSPECIFIED';
  dataPoints: BiomarkerTrendPoint[];
}

export interface PatientMedicationItem {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  status: 'active' | 'completed' | 'stopped' | 'unknown';
  startDate: string | null;
  endDate: string | null;
  confidence: 'high' | 'low';
  sourceDocument?: string;
  sourceDocId?: string;
}

export interface CalendarDayEvent {
  date: string; // YYYY-MM-DD
  documentId: string;
  fileName: string;
  documentType: string;
  abnormalCount: number;
  medsCount: number;
  aiSummary: string | null;
}

export class TrendsService {
  /**
   * Aggregates and normalizes longitudinal biomarker observations.
   */
  static async getBiomarkerTrends(patientId: string): Promise<BiomarkerTrendGroup[]> {
    const cleanId = patientId.toUpperCase();

    const [observations, documents] = await Promise.all([
      ObservationModel.find({ patientId: cleanId }).sort({ effectiveDateTime: 1 }),
      DocumentModel.find({ patientId: cleanId }).sort({ reportDate: 1, uploadedAt: 1 }),
    ]);

    const groupMap = new Map<string, BiomarkerTrendPoint[]>();
    const docLookup = new Map<string, string>();
    for (const doc of documents) {
      docLookup.set(doc.documentId, doc.fileName);
    }

    // 1. Process ObservationModel
    for (const obs of observations) {
      const numVal = typeof obs.value === 'number' ? obs.value : parseFloat(String(obs.value));
      if (isNaN(numVal)) continue;

      const dateStr = obs.effectiveDateTime
        ? new Date(obs.effectiveDateTime).toISOString().split('T')[0]
        : obs.issued
        ? new Date(obs.issued).toISOString().split('T')[0]
        : 'Unknown Date';

      const normName = obs.code.trim();
      const existing = groupMap.get(normName) || [];
      existing.push({
        date: dateStr,
        value: numVal,
        unit: obs.unit,
        interpretation: obs.interpretation as BiomarkerTrendPoint['interpretation'],
        referenceLow: obs.referenceLow,
        referenceHigh: obs.referenceHigh,
        documentId: obs.documentId,
        documentName: docLookup.get(obs.documentId) || 'Lab Report',
      });
      groupMap.set(normName, existing);
    }

    // 2. Process DocumentModel abnormalFindings if not captured in observations
    for (const doc of documents) {
      if (doc.abnormalFindings && doc.abnormalFindings.length > 0) {
        const docDate = doc.reportDate || doc.uploadedAt?.toISOString().split('T')[0] || 'Unknown Date';
        for (const finding of doc.abnormalFindings) {
          const numVal = typeof finding.value === 'number' ? finding.value : parseFloat(String(finding.value));
          if (isNaN(numVal)) continue;

          const normName = finding.testName.trim();
          const existing = groupMap.get(normName) || [];

          // Prevent exact duplicate for same doc and value
          const isDuplicate = existing.some(
            (p) => p.documentId === doc.documentId && p.value === numVal
          );
          if (!isDuplicate) {
            existing.push({
              date: docDate,
              value: numVal,
              unit: finding.unit,
              interpretation: finding.interpretation as BiomarkerTrendPoint['interpretation'],
              referenceLow: finding.referenceRange?.low ?? null,
              referenceHigh: finding.referenceRange?.high ?? null,
              documentId: doc.documentId,
              documentName: doc.fileName,
            });
            groupMap.set(normName, existing);
          }
        }
      }
    }

    // 3. Assemble trend groups
    const result: BiomarkerTrendGroup[] = [];

    for (const [testName, points] of groupMap.entries()) {
      if (points.length === 0) continue;

      // Sort points chronologically
      points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Find best available reference limits & unit
      const refLow = points.find((p) => p.referenceLow !== null)?.referenceLow ?? null;
      const refHigh = points.find((p) => p.referenceHigh !== null)?.referenceHigh ?? null;
      const unit = points.find((p) => p.unit)?.unit ?? null;

      const latest = points[points.length - 1];

      result.push({
        testName,
        unit,
        referenceLow: refLow,
        referenceHigh: refHigh,
        hasEnoughData: points.length >= 2,
        latestValue: latest.value,
        latestDate: latest.date,
        latestInterpretation: latest.interpretation,
        dataPoints: points,
      });
    }

    // Sort groups with >= 2 points first, then alphabetically
    result.sort((a, b) => {
      if (a.hasEnoughData && !b.hasEnoughData) return -1;
      if (!a.hasEnoughData && b.hasEnoughData) return 1;
      return a.testName.localeCompare(b.testName);
    });

    return result;
  }

  /**
   * Retrieves active and completed patient medications.
   */
  static async getPatientMedications(patientId: string): Promise<PatientMedicationItem[]> {
    const cleanId = patientId.toUpperCase();

    const [medStatements, documents] = await Promise.all([
      MedicationStatementModel.find({ patientId: cleanId }),
      DocumentModel.find({ patientId: cleanId }),
    ]);

    const docLookup = new Map<string, string>();
    for (const doc of documents) {
      docLookup.set(doc.documentId, doc.fileName);
    }

    const items: PatientMedicationItem[] = [];
    const seen = new Set<string>();

    for (const m of medStatements) {
      const key = `${m.medicationName.toLowerCase()}_${m.dosage || ''}`;
      seen.add(key);
      items.push({
        id: m._id?.toString() || Math.random().toString(36).substring(7),
        name: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || null,
        status: m.status || 'active',
        startDate: m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : null,
        endDate: m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : null,
        confidence: m.confidence || 'high',
        sourceDocument: docLookup.get(m.documentId) || 'Prescription',
        sourceDocId: m.documentId,
      });
    }

    // Include document medicines if not in MedicationStatement
    for (const doc of documents) {
      if (doc.medicines && doc.medicines.length > 0) {
        for (const med of doc.medicines) {
          const key = `${med.name.toLowerCase()}_${med.dosage || ''}`;
          if (seen.has(key)) continue;
          seen.add(key);

          // Evaluate active vs completed using endDate
          let status: PatientMedicationItem['status'] = 'active';
          if (med.endDate) {
            const end = new Date(med.endDate);
            if (!isNaN(end.getTime()) && end < new Date()) {
              status = 'completed';
            }
          }

          items.push({
            id: `doc-${doc.documentId}-${Math.random().toString(36).substring(7)}`,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions || null,
            status,
            startDate: med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : null,
            endDate: med.endDate ? new Date(med.endDate).toISOString().split('T')[0] : null,
            confidence: med.confidence || 'high',
            sourceDocument: doc.fileName,
            sourceDocId: doc.documentId,
          });
        }
      }
    }

    return items;
  }

  /**
   * Collects all health events by calendar date.
   */
  static async getCalendarEvents(patientId: string): Promise<CalendarDayEvent[]> {
    const cleanId = patientId.toUpperCase();
    const documents = await DocumentModel.find({ patientId: cleanId }).sort({
      reportDate: -1,
      uploadedAt: -1,
    });

    const events: CalendarDayEvent[] = [];

    for (const doc of documents) {
      const date = doc.reportDate || (doc.uploadedAt ? doc.uploadedAt.toISOString().split('T')[0] : 'Unknown');
      events.push({
        date,
        documentId: doc.documentId,
        fileName: doc.fileName,
        documentType: doc.documentType,
        abnormalCount: doc.abnormalFindings ? doc.abnormalFindings.length : 0,
        medsCount: doc.medicines ? doc.medicines.length : 0,
        aiSummary: doc.aiSummary,
      });
    }

    return events;
  }
}
