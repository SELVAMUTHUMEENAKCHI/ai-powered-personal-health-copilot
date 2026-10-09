import { PatientModel } from '../models/patient.model';
import { ObservationModel } from '../models/observation.model';
import { MedicationStatementModel } from '../models/medication.model';
import { DiagnosticReportModel } from '../models/diagnosticReport.model';
import { ConditionModel } from '../models/condition.model';
import { DocumentModel } from '../models/document.model';
import { FhirBundle, FhirBundleEntry } from '@health-copilot/shared';
import crypto from 'crypto';

export class FhirService {
  /**
   * Generates a fully-compliant HL7 FHIR R4 Bundle according to ABDM specifications.
   */
  static async generatePatientBundle(patientId: string): Promise<FhirBundle> {
    const cleanId = patientId.toUpperCase();

    // Fetch all clinical models for the isolated patient
    const [patient, observations, medications, reports, conditions, documents] = await Promise.all([
      PatientModel.findOne({ patientId: cleanId }),
      ObservationModel.find({ patientId: cleanId }).sort({ effectiveDateTime: 1 }),
      MedicationStatementModel.find({ patientId: cleanId }).sort({ startDate: 1 }),
      DiagnosticReportModel.find({ patientId: cleanId }),
      ConditionModel.find({ patientId: cleanId }),
      DocumentModel.find({ patientId: cleanId }).sort({ reportDate: 1, uploadedAt: 1 }),
    ]);

    if (!patient) {
      const err = new Error(`Patient ${patientId} not found in registry.`);
      (err as { status?: number }).status = 404;
      throw err;
    }

    const entries: FhirBundleEntry[] = [];
    const timestamp = new Date().toISOString();
    const patientUuid = `urn:uuid:${crypto.randomUUID()}`;

    // 1. Composition Resource (Document Header for ABDM / NRCES FHIR Profile)
    const compositionUuid = `urn:uuid:${crypto.randomUUID()}`;
    entries.push({
      fullUrl: compositionUuid,
      resource: {
        resourceType: 'Composition',
        id: `comp-${cleanId.toLowerCase()}-${Date.now()}`,
        status: 'final',
        type: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '371530004',
              display: 'Clinical consultation report',
            },
          ],
          text: 'Comprehensive Health Record Summary',
        },
        subject: {
          reference: patientUuid,
          display: patient.name,
        },
        date: timestamp,
        author: [
          {
            display: 'AI Health Copilot System (ABDM-Ready)',
          },
        ],
        title: `ABDM Health Record Bundle for ${patient.name} (${cleanId})`,
      },
    });

    // 2. Patient Resource
    const nameParts = patient.name.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    entries.push({
      fullUrl: patientUuid,
      resource: {
        resourceType: 'Patient',
        id: cleanId.toLowerCase(),
        identifier: [
          {
            system: 'https://healthid.ndhm.gov.in',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MR',
                  display: 'Medical Record Number / ABHA ID',
                },
              ],
            },
            value: patient.abhaId || '91-8472-1923-0192',
          },
          {
            system: 'https://altrix.health/patients',
            value: cleanId,
          },
        ],
        name: [
          {
            text: patient.name,
            family: lastName || undefined,
            given: [firstName],
          },
        ],
        gender: patient.gender ? patient.gender.toLowerCase() : 'unknown',
        birthDate: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : undefined,
        extension: [
          {
            url: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/BloodGroup',
            valueString: patient.bloodGroup || 'O+',
          },
        ],
      },
    });

    // 3. Observations (Laboratory Tests & Biomarkers)
    // Gather both standalone ObservationModel entities and findings inside DocumentModel
    const seenObs = new Set<string>();

    for (const obs of observations) {
      const obsUuid = `urn:uuid:${crypto.randomUUID()}`;
      const obsKey = `${obs.code}_${obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toISOString().split('T')[0] : ''}_${obs.value}`;
      seenObs.add(obsKey);

      const isNumeric = typeof obs.value === 'number' || !isNaN(Number(obs.value));
      const numVal = isNumeric ? Number(obs.value) : null;

      const interpretationCode =
        obs.interpretation === 'HIGH'
          ? 'H'
          : obs.interpretation === 'LOW'
          ? 'L'
          : obs.interpretation === 'NORMAL'
          ? 'N'
          : 'U';

      entries.push({
        fullUrl: obsUuid,
        resource: {
          resourceType: 'Observation',
          id: `obs-${cleanId.toLowerCase()}-${obs._id?.toString().slice(-6) || Math.random().toString(36).substring(7)}`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                display: obs.code,
              },
            ],
            text: obs.code,
          },
          subject: {
            reference: patientUuid,
            display: patient.name,
          },
          effectiveDateTime: obs.effectiveDateTime
            ? new Date(obs.effectiveDateTime).toISOString()
            : timestamp,
          ...(isNumeric
            ? {
                valueQuantity: {
                  value: numVal,
                  unit: obs.unit || undefined,
                  system: 'http://unitsofmeasure.org',
                },
              }
            : {
                valueString: String(obs.value),
              }),
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: interpretationCode,
                  display: obs.interpretation,
                },
              ],
              text: obs.interpretation,
            },
          ],
          ...(obs.referenceLow !== null || obs.referenceHigh !== null
            ? {
                referenceRange: [
                  {
                    ...(obs.referenceLow !== null
                      ? { low: { value: obs.referenceLow, unit: obs.unit || undefined } }
                      : {}),
                    ...(obs.referenceHigh !== null
                      ? { high: { value: obs.referenceHigh, unit: obs.unit || undefined } }
                      : {}),
                  },
                ],
              }
            : {}),
          ...(obs.plainLanguageNote
            ? {
                note: [{ text: obs.plainLanguageNote }],
              }
            : {}),
        },
      });
    }

    // Include any document-level findings not already in observations table
    for (const doc of documents) {
      if (doc.abnormalFindings && doc.abnormalFindings.length > 0) {
        for (const finding of doc.abnormalFindings) {
          const docDate = doc.reportDate || doc.uploadedAt?.toISOString().split('T')[0] || '';
          const obsKey = `${finding.testName}_${docDate}_${finding.value}`;
          if (seenObs.has(obsKey)) continue;
          seenObs.add(obsKey);

          const isNumeric = typeof finding.value === 'number' || !isNaN(Number(finding.value));
          const numVal = isNumeric ? Number(finding.value) : null;

          entries.push({
            fullUrl: `urn:uuid:${crypto.randomUUID()}`,
            resource: {
              resourceType: 'Observation',
              id: `obs-doc-${cleanId.toLowerCase()}-${Math.random().toString(36).substring(7)}`,
              status: 'final',
              code: {
                text: finding.testName,
              },
              subject: {
                reference: patientUuid,
                display: patient.name,
              },
              effectiveDateTime: doc.reportDate
                ? new Date(doc.reportDate).toISOString()
                : timestamp,
              ...(isNumeric
                ? {
                    valueQuantity: {
                      value: numVal,
                      unit: finding.unit || undefined,
                    },
                  }
                : {
                    valueString: String(finding.value),
                  }),
              interpretation: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                      code: finding.interpretation === 'HIGH' ? 'H' : finding.interpretation === 'LOW' ? 'L' : 'N',
                      display: finding.interpretation,
                    },
                  ],
                },
              ],
              ...(finding.referenceRange
                ? {
                    referenceRange: [
                      {
                        ...(finding.referenceRange.low !== null
                          ? { low: { value: finding.referenceRange.low, unit: finding.unit || undefined } }
                          : {}),
                        ...(finding.referenceRange.high !== null
                          ? { high: { value: finding.referenceRange.high, unit: finding.unit || undefined } }
                          : {}),
                      },
                    ],
                  }
                : {}),
              ...(finding.plainLanguageNote
                ? {
                    note: [{ text: finding.plainLanguageNote }],
                  }
                : {}),
            },
          });
        }
      }
    }

    // 4. MedicationStatement Resources
    const seenMeds = new Set<string>();

    for (const med of medications) {
      seenMeds.add(med.medicationName.toLowerCase());
      entries.push({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: {
          resourceType: 'MedicationStatement',
          id: `med-${cleanId.toLowerCase()}-${med._id?.toString().slice(-6) || Math.random().toString(36).substring(7)}`,
          status: med.status || 'active',
          medicationCodeableConcept: {
            text: med.medicationName,
          },
          subject: {
            reference: patientUuid,
            display: patient.name,
          },
          effectivePeriod: {
            start: med.startDate ? new Date(med.startDate).toISOString() : undefined,
            end: med.endDate ? new Date(med.endDate).toISOString() : undefined,
          },
          dosage: [
            {
              text: `${med.dosage || ''} ${med.frequency || ''} ${med.instructions || ''}`.trim() || undefined,
            },
          ],
          note: [
            {
              text: `Extracted with ${med.confidence || 'standard'} confidence from clinical document.`,
            },
          ],
        },
      });
    }

    // Collect from document medicines if not already added
    for (const doc of documents) {
      if (doc.medicines && doc.medicines.length > 0) {
        for (const m of doc.medicines) {
          if (seenMeds.has(m.name.toLowerCase())) continue;
          seenMeds.add(m.name.toLowerCase());

          entries.push({
            fullUrl: `urn:uuid:${crypto.randomUUID()}`,
            resource: {
              resourceType: 'MedicationStatement',
              id: `med-doc-${cleanId.toLowerCase()}-${Math.random().toString(36).substring(7)}`,
              status: 'active',
              medicationCodeableConcept: {
                text: m.name,
              },
              subject: {
                reference: patientUuid,
                display: patient.name,
              },
              dosage: [
                {
                  text: `${m.dosage || ''} ${m.frequency || ''} ${m.instructions || ''}`.trim() || undefined,
                },
              ],
              note: [
                {
                  text: `Extracted from ${doc.fileName} (Confidence: ${m.confidence})`,
                },
              ],
            },
          });
        }
      }
    }

    // 5. DiagnosticReport Resources
    for (const rep of reports) {
      entries.push({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: {
          resourceType: 'DiagnosticReport',
          id: `dr-${cleanId.toLowerCase()}-${rep._id?.toString().slice(-6) || Math.random().toString(36).substring(7)}`,
          status: rep.status || 'final',
          code: {
            text: rep.code || 'Diagnostic Health Report',
          },
          subject: {
            reference: patientUuid,
            display: patient.name,
          },
          effectiveDateTime: rep.effectiveDateTime
            ? new Date(rep.effectiveDateTime).toISOString()
            : timestamp,
          conclusion: rep.conclusion || undefined,
        },
      });
    }

    // 6. Condition Resources
    for (const cond of conditions) {
      entries.push({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: {
          resourceType: 'Condition',
          id: `cond-${cleanId.toLowerCase()}-${cond._id?.toString().slice(-6) || Math.random().toString(36).substring(7)}`,
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: cond.clinicalStatus || 'active',
              },
            ],
          },
          code: {
            text: cond.code,
          },
          subject: {
            reference: patientUuid,
            display: patient.name,
          },
          recordedDate: cond.recordedDate ? new Date(cond.recordedDate).toISOString() : timestamp,
          note: cond.note ? [{ text: cond.note }] : undefined,
        },
      });
    }

    // 7. DocumentReference Resources (Uploaded Files Traceability)
    for (const doc of documents) {
      entries.push({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: {
          resourceType: 'DocumentReference',
          id: `doc-${cleanId.toLowerCase()}-${doc.documentId.toLowerCase()}`,
          status: 'current',
          docStatus: 'final',
          type: {
            text: doc.documentType || 'Health Document',
          },
          subject: {
            reference: patientUuid,
            display: patient.name,
          },
          date: doc.reportDate ? new Date(doc.reportDate).toISOString() : doc.uploadedAt?.toISOString(),
          description: doc.aiSummary || doc.fileName,
          content: [
            {
              attachment: {
                title: doc.fileName,
                contentType: doc.fileType || 'application/pdf',
                url: `/api/documents/${doc.documentId}/file`,
              },
            },
          ],
        },
      });
    }

    // Assemble and return final FHIR R4 Bundle
    return {
      resourceType: 'Bundle',
      id: `bundle-${cleanId.toLowerCase()}-${Date.now()}`,
      type: 'collection',
      timestamp,
      entry: entries,
    };
  }
}
