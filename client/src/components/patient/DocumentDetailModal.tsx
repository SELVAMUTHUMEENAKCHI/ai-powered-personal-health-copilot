import React from 'react';
import { X, Calendar, FileText, Pill, AlertCircle, ExternalLink, Download } from 'lucide-react';
import { MedicalDocument } from '@health-copilot/shared';
import { StatusBadge } from '../common/StatusBadge';
import { MedicalDisclaimer } from '../common/MedicalDisclaimer';
import { DocumentApiService } from '../../services/document.service';

interface DocumentDetailModalProps {
  document: MedicalDocument | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: doc,
  onClose,
}) => {
  if (!doc) return null;

  const fileStreamUrl = DocumentApiService.getFileStreamUrl(doc.documentId);
  const isImage = doc.fileType.startsWith('image/');
  const isPdf = doc.fileType.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {doc.fileName}
                </h3>
                <StatusBadge status={doc.processingStatus} size="sm" />
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Report Date: {doc.reportDate || 'Not Available'}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]">ID: {doc.documentId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={fileStreamUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Open Raw File in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={fileStreamUrl}
              download={doc.fileName}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {/* Left Pane: Original Document Preview */}
          <div className="h-full bg-slate-100/60 dark:bg-slate-950/60 overflow-auto p-4 flex items-center justify-center">
            {isPdf ? (
              <iframe
                src={`${fileStreamUrl}#toolbar=0`}
                title="Original PDF Document Preview"
                className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
              />
            ) : isImage ? (
              <img
                src={fileStreamUrl}
                alt={doc.fileName}
                className="max-h-full max-w-full rounded-2xl object-contain border border-slate-200 dark:border-slate-800 shadow"
              />
            ) : (
              <div className="text-center p-8 text-slate-400 space-y-2">
                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Preview not supported for this file format.</p>
                <a
                  href={fileStreamUrl}
                  download={doc.fileName}
                  className="text-xs text-health-600 hover:underline font-semibold"
                >
                  Download to view
                </a>
              </div>
            )}
          </div>

          {/* Right Pane: Extracted Parameters & Plain Language Explanation */}
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
            {/* Safety Disclaimer Banner */}
            <MedicalDisclaimer compact />

            {/* AI Plain-Language Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Plain-Language Overview
              </h4>
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
                {doc.aiSummary || 'Document processed and saved to patient record.'}
              </div>
            </div>

            {/* Abnormal Findings Callout */}
            {doc.abnormalFindings && doc.abnormalFindings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                  Abnormal Findings ({doc.abnormalFindings.length})
                </h4>
                <div className="space-y-2">
                  {doc.abnormalFindings.map((af, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {af.testName}
                        </span>
                        <StatusBadge status={af.interpretation} size="sm" />
                      </div>
                      <p className="text-rose-900 dark:text-rose-200 leading-relaxed text-[11px]">
                        {af.plainLanguageNote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Lab Tests Table */}
            {doc.abnormalFindings && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Extracted Lab Parameters
                </h4>
                {doc.abnormalFindings.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    All evaluated parameters were within reference intervals or non-quantitative.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Test Name</th>
                          <th className="py-2 px-3 font-semibold">Result</th>
                          <th className="py-2 px-3 font-semibold">Ref Range</th>
                          <th className="py-2 px-3 font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {doc.abnormalFindings.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                              {t.testName}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              {t.value} {t.unit || ''}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {t.referenceRange && t.referenceRange.low != null && t.referenceRange.high != null
                                ? `${t.referenceRange.low} – ${t.referenceRange.high}`
                                : t.referenceRange?.rawText || 'None'}
                            </td>
                            <td className="py-2.5 px-3">
                              <StatusBadge status={t.interpretation} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Prescribed Medications */}
            {doc.medicines && doc.medicines.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
                  <Pill className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  Prescribed Medications ({doc.medicines.length})
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Medicine</th>
                        <th className="py-2 px-3 font-semibold">Dosage</th>
                        <th className="py-2 px-3 font-semibold">Frequency</th>
                        <th className="py-2 px-3 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {doc.medicines.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {m.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{m.dosage || '—'}</td>
                          <td className="py-2.5 px-3">{m.frequency || '—'}</td>
                          <td className="py-2.5 px-3">{m.duration || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Explicit Diagnoses */}
            {doc.explicitDiagnoses && doc.explicitDiagnoses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Diagnoses Mentioned in Document
                </h4>
                <div className="space-y-1.5">
                  {doc.explicitDiagnoses.map((diag, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      {diag}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
