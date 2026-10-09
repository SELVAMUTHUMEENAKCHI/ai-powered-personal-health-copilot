import React, { useState } from 'react';
import { Calendar as CalendarIcon, FileText, ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { MedicalDocument } from '@health-copilot/shared';
import { StatusBadge } from '../common/StatusBadge';

interface HealthCalendarProps {
  documents: MedicalDocument[];
  onSelectDocument: (doc: MedicalDocument) => void;
}

export const HealthCalendar: React.FC<HealthCalendarProps> = ({
  documents,
  onSelectDocument,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Determine current viewing month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group documents by date string (YYYY-MM-DD)
  // Maps both reportDate and uploadDate
  const docsByDate: Record<string, { reportDocs: MedicalDocument[]; uploadDocs: MedicalDocument[] }> = {};

  documents.forEach((doc) => {
    const uploadDateStr = new Date(doc.uploadedAt).toISOString().split('T')[0];
    if (!docsByDate[uploadDateStr]) {
      docsByDate[uploadDateStr] = { reportDocs: [], uploadDocs: [] };
    }
    docsByDate[uploadDateStr].uploadDocs.push(doc);

    if (doc.reportDate) {
      if (!docsByDate[doc.reportDate]) {
        docsByDate[doc.reportDate] = { reportDocs: [], uploadDocs: [] };
      }
      docsByDate[doc.reportDate].reportDocs.push(doc);
    }
  });

  const getDayFormattedStr = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Selected date documents
  const activeSelectedDateDocs = selectedDateStr ? docsByDate[selectedDateStr] : null;

  return (
    <div className="space-y-6">
      {/* Calendar Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Health Record Calendar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize medical records by Report Date and Upload Date
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 min-w-32 text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span>Report Date (Inside document)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Upload Date (Ingestion timestamp)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center pt-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}

          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 sm:h-18 p-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 opacity-30" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = getDayFormattedStr(dayNum);
            const dateData = docsByDate[dateStr];
            const hasReportDocs = (dateData?.reportDocs?.length || 0) > 0;
            const hasUploadDocs = (dateData?.uploadDocs?.length || 0) > 0;
            const isSelected = selectedDateStr === dateStr;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-14 sm:h-18 p-1 sm:p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-health-500 bg-health-50/50 dark:bg-health-950/30 ring-2 ring-health-500/20'
                    : hasReportDocs || hasUploadDocs
                    ? 'border-teal-200 dark:border-teal-900/60 bg-white dark:bg-slate-900 hover:border-teal-400'
                    : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <span className={`text-xs font-semibold ${isSelected ? 'text-health-700 dark:text-health-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {dayNum}
                </span>

                <div className="flex flex-wrap gap-1">
                  {hasReportDocs && (
                    <span className="w-2 h-2 rounded-full bg-teal-500" title="Report Date on this day" />
                  )}
                  {hasUploadDocs && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" title="Uploaded on this day" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Drawer / Panel */}
      {selectedDateStr && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-health-600 dark:text-health-400" />
                Records Associated with {selectedDateStr}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed distinction between Report Date and Upload Date
              </p>
            </div>
            <button
              onClick={() => setSelectedDateStr(null)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Close
            </button>
          </div>

          {!activeSelectedDateDocs ||
          (activeSelectedDateDocs.reportDocs.length === 0 && activeSelectedDateDocs.uploadDocs.length === 0) ? (
            <p className="text-xs text-slate-500 italic py-2">
              No documents logged with report date or upload date on {selectedDateStr}.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Combine unique documents */}
              {Array.from(
                new Set([...(activeSelectedDateDocs?.reportDocs || []), ...(activeSelectedDateDocs?.uploadDocs || [])])
              ).map((doc) => {
                const isReportDateMatch = doc.reportDate === selectedDateStr;
                const isUploadDateMatch =
                  new Date(doc.uploadedAt).toISOString().split('T')[0] === selectedDateStr;

                return (
                  <div
                    key={doc.documentId}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {doc.fileName}
                        </span>
                        <StatusBadge status={doc.processingStatus} size="sm" />
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isReportDateMatch
                              ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                          }`}
                        >
                          Report Date: {doc.reportDate || 'Not available'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isUploadDateMatch
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                          }`}
                        >
                          Upload Date: {new Date(doc.uploadedAt).toISOString().split('T')[0]}
                        </span>
                      </div>

                      {doc.abnormalFindings && doc.abnormalFindings.length > 0 && (
                        <div className="flex items-center text-[11px] text-rose-600 dark:text-rose-400 pt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          <span>{doc.abnormalFindings.length} abnormal finding(s) detected</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectDocument(doc)}
                      className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-health-600 hover:bg-health-700 text-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
