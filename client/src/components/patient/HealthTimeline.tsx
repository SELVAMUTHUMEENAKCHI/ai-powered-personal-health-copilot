import React from 'react';
import { FileText, Calendar, Pill, AlertCircle, Eye, ArrowUpRight } from 'lucide-react';
import { MedicalDocument } from '@health-copilot/shared';
import { StatusBadge } from '../common/StatusBadge';

interface HealthTimelineProps {
  documents: MedicalDocument[];
  onSelectDocument: (doc: MedicalDocument) => void;
  loading?: boolean;
}

export const HealthTimeline: React.FC<HealthTimelineProps> = ({
  documents,
  onSelectDocument,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  // Sort reverse-chronologically by reportDate (fallback to uploadedAt)
  const sortedDocs = [...(documents || [])].sort((a, b) => {
    const dateA = new Date(a.reportDate || a.uploadedAt).getTime();
    const dateB = new Date(b.reportDate || b.uploadedAt).getTime();
    return dateB - dateA;
  });

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'lab_report':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            Lab Report
          </span>
        );
      case 'prescription':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            Prescription
          </span>
        );
      case 'discharge_summary':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Discharge Summary
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Medical Record
          </span>
        );
    }
  };

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {sortedDocs.map((doc) => {
        const effectiveDate = doc.reportDate || new Date(doc.uploadedAt).toISOString().split('T')[0];
        const isFromReport = Boolean(doc.reportDate);
        const abnormalCount = doc.abnormalFindings?.length || 0;
        const medsCount = doc.medicines?.length || 0;

        return (
          <div key={doc.documentId} className="relative group">
            {/* Timeline Node Icon */}
            <div className="absolute -left-6 sm:-left-8 top-4 -translate-x-1/2 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-health-500 flex items-center justify-center text-health-600 dark:text-health-400 shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="w-3.5 h-3.5" />
            </div>

            {/* Document Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-health-500/50 dark:hover:border-health-500/50 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {doc.fileName}
                  </span>
                  {getDocTypeBadge(doc.documentType)}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center font-medium">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {effectiveDate}
                    <span className="text-[10px] ml-1 text-slate-400">
                      ({isFromReport ? 'Report Date' : 'Upload Date'})
                    </span>
                  </span>
                  <StatusBadge status={doc.processingStatus} size="sm" />
                </div>
              </div>

              {/* Summary Snippet */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                {doc.aiSummary || 'Document processed and indexed into clinical record.'}
              </p>

              {/* Extraction Badges & Action */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2 text-xs">
                  {abnormalCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                      {abnormalCount} abnormal finding{abnormalCount > 1 ? 's' : ''}
                    </span>
                  )}

                  {medsCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      <Pill className="w-3 h-3 mr-1 text-teal-600" />
                      {medsCount} medication{medsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onSelectDocument(doc)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-health-600 hover:text-health-700 dark:text-health-400 dark:hover:text-health-300 group-hover:translate-x-0.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
