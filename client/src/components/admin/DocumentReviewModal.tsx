import React, { useState } from 'react';
import {
  MedicalDocument,
  DocumentType,
  Interpretation,
  ExtractedMedicine,
  AbnormalFinding,
} from '@health-copilot/shared';
import { AdminApiService } from '../../services/admin.service';
import { DocumentApiService } from '../../services/document.service';
import { StatusBadge } from '../common/StatusBadge';

interface DocumentReviewModalProps {
  document: MedicalDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSaved: (updatedDoc: MedicalDocument) => void;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onReviewSaved,
}) => {
  if (!isOpen || !doc) return null;

  const [reportDate, setReportDate] = useState<string>(doc.reportDate || '');
  const [docType, setDocType] = useState<DocumentType>(doc.documentType || 'other');
  const [summary, setSummary] = useState<string>(doc.aiSummary || '');
  const [findings, setFindings] = useState<AbnormalFinding[]>(doc.abnormalFindings || []);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>(doc.medicines || []);
  const [diagnoses, setDiagnoses] = useState<string[]>(doc.explicitDiagnoses || []);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileStreamUrl = DocumentApiService.getFileStreamUrl(doc.documentId);
  const isPdf = doc.fileType === 'application/pdf';

  // Finding manipulation
  const updateFinding = (idx: number, patch: Partial<AbnormalFinding>) => {
    setFindings((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeFinding = (idx: number) => {
    setFindings((prev) => prev.filter((_, i) => i !== idx));
  };

  const addFinding = () => {
    setFindings((prev) => [
      ...prev,
      {
        testName: 'New Test',
        value: '',
        unit: 'mg/dL',
        referenceRange: { low: null, high: null },
        interpretation: 'NORMAL' as Interpretation,
        plainLanguageNote: '',
      },
    ]);
  };

  // Medicine manipulation
  const updateMedicine = (idx: number, patch: Partial<ExtractedMedicine>) => {
    setMedicines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeMedicine = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: 'New Medicine',
        dosage: '500mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'After meals',
        confidence: 'high',
      },
    ]);
  };

  // Diagnosis manipulation
  const handleAddDiagnosis = () => {
    if (!newDiagnosis.trim()) return;
    setDiagnoses((prev) => [...prev, newDiagnosis.trim()]);
    setNewDiagnosis('');
  };

  const handleRemoveDiagnosis = (idx: number) => {
    setDiagnoses((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Review
  const handleSaveReview = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const updated = await AdminApiService.reviewDocument(doc.documentId, {
        reportDate: reportDate || null,
        documentType: docType,
        aiSummary: summary || null,
        abnormalFindings: findings.map((f) => ({
          testName: f.testName,
          value: f.value,
          unit: f.unit ?? null,
          referenceRange: f.referenceRange
            ? {
                low: f.referenceRange.low ?? null,
                high: f.referenceRange.high ?? null,
                rawText: f.referenceRange.rawText ?? null,
              }
            : null,
          interpretation: f.interpretation,
          plainLanguageNote: f.plainLanguageNote,
        })),
        medicines: medicines.map((m) => ({
          name: m.name,
          dosage: m.dosage ?? null,
          frequency: m.frequency ?? null,
          duration: m.duration ?? null,
          instructions: m.instructions ?? null,
          confidence: m.confidence,
          startDate: m.startDate ?? null,
          endDate: m.endDate ?? null,
        })),
        explicitDiagnoses: diagnoses,
        adminReviewed: true,
      });

      setSuccessMsg('Document successfully verified and synchronized with patient records.');
      setTimeout(() => {
        onReviewSaved(updated);
        onClose();
      }, 900);
    } catch (err) {
      setError((err as Error).message || 'Failed to save document review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Clinical Extraction Review & Verification
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {doc.documentId}
              </span>
              {doc.adminReviewed ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Pending Verification
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source file: <span className="font-medium text-slate-700 dark:text-slate-300">{doc.fileName}</span> •
              Patient: <span className="font-medium text-teal-600 font-mono">{doc.patientId}</span> ({doc.patientName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-2.5 px-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-2.5 px-6 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Split Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Panel: Original Source Document */}
          <div className="h-full bg-slate-100 dark:bg-slate-950/60 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Original Source Document Stream</span>
              <a
                href={fileStreamUrl}
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 hover:underline flex items-center gap-1"
              >
                <span>Open in New Tab</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            <div className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
              {isPdf ? (
                <iframe
                  src={`${fileStreamUrl}#toolbar=0`}
                  title="Medical Document Stream"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="w-full h-full p-4 overflow-auto flex items-center justify-center">
                  <img
                    src={fileStreamUrl}
                    alt="Medical Document"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Editable Extraction Fields */}
          <div className="h-full p-6 overflow-y-auto space-y-6 bg-white dark:bg-slate-900">
            {/* Metadata row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Report Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="lab_report">Lab Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="other">Other Clinical Document</option>
                </select>
              </div>
            </div>

            {/* AI Summary textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Plain-Language Clinical Summary
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Plain language explanation for patient..."
              />
            </div>

            {/* Lab Tests Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Extracted Lab Tests ({findings.length})
                </span>
                <button
                  type="button"
                  onClick={addFinding}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  + Add Test Parameter
                </button>
              </div>

              {findings.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                  No quantitative lab tests recorded. Click "+ Add Test Parameter" to include one.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {findings.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={f.testName}
                          onChange={(e) => updateFinding(idx, { testName: e.target.value })}
                          placeholder="Test Name"
                          className="col-span-5 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                        />
                        <input
                          type="text"
                          value={f.value}
                          onChange={(e) => updateFinding(idx, { value: e.target.value })}
                          placeholder="Value"
                          className="col-span-3 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <input
                          type="text"
                          value={f.unit || ''}
                          onChange={(e) => updateFinding(idx, { unit: e.target.value })}
                          placeholder="Unit"
                          className="col-span-2 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeFinding(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center text-[11px]">
                        <div className="flex items-center gap-1 font-mono text-slate-500">
                          <span>Ref:</span>
                          <input
                            type="number"
                            value={f.referenceRange?.low ?? ''}
                            onChange={(e) =>
                              updateFinding(idx, {
                                referenceRange: {
                                  low: e.target.value ? parseFloat(e.target.value) : null,
                                  high: f.referenceRange?.high ?? null,
                                },
                              })
                            }
                            placeholder="Low"
                            className="w-14 p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center"
                          />
                          <span>–</span>
                          <input
                            type="number"
                            value={f.referenceRange?.high ?? ''}
                            onChange={(e) =>
                              updateFinding(idx, {
                                referenceRange: {
                                  low: f.referenceRange?.low ?? null,
                                  high: e.target.value ? parseFloat(e.target.value) : null,
                                },
                              })
                            }
                            placeholder="High"
                            className="w-14 p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center"
                          />
                        </div>

                        <div>
                          <select
                            value={f.interpretation}
                            onChange={(e) =>
                              updateFinding(idx, { interpretation: e.target.value as Interpretation })
                            }
                            className="w-full p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-[11px]"
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="HIGH">HIGH</option>
                            <option value="LOW">LOW</option>
                            <option value="UNSPECIFIED">UNSPECIFIED</option>
                          </select>
                        </div>

                        <div className="text-right">
                          <StatusBadge status={f.interpretation} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Medications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Prescribed Medications ({medicines.length})
                </span>
                <button
                  type="button"
                  onClick={addMedicine}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
                >
                  + Add Medication
                </button>
              </div>

              {medicines.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                  No prescribed medicines recorded.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {medicines.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMedicine(idx, { name: e.target.value })}
                          placeholder="Medicine Name"
                          className="col-span-5 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                        <input
                          type="text"
                          value={m.dosage || ''}
                          onChange={(e) => updateMedicine(idx, { dosage: e.target.value })}
                          placeholder="Dosage (e.g. 500mg)"
                          className="col-span-3 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={m.frequency || ''}
                          onChange={(e) => updateMedicine(idx, { frequency: e.target.value })}
                          placeholder="Frequency (e.g. 1-0-1)"
                          className="col-span-3 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => removeMedicine(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={m.duration || ''}
                          onChange={(e) => updateMedicine(idx, { duration: e.target.value })}
                          placeholder="Duration (e.g. 30 days)"
                          className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                        <input
                          type="text"
                          value={m.instructions || ''}
                          onChange={(e) => updateMedicine(idx, { instructions: e.target.value })}
                          placeholder="Instructions (e.g. After meals)"
                          className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Explicit Diagnoses */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Explicit Diagnoses ({diagnoses.length})
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDiagnosis}
                  onChange={(e) => setNewDiagnosis(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDiagnosis())}
                  placeholder="Type diagnosis and press Add (e.g. Type 2 Diabetes)..."
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddDiagnosis}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {diagnoses.map((diag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{diag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDiagnosis(idx)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Human-in-the-loop review overrides will immediately synchronize with FHIR Clinical models.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveReview}
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              {saving ? 'Saving & Verifying...' : 'Verify & Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
