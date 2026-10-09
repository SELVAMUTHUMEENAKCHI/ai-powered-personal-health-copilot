import React from 'react';
import { Activity, AlertCircle, Pill, FileText, Calendar } from 'lucide-react';
import { PatientSummary } from '@health-copilot/shared';

interface HealthSummaryCardProps {
  summary: PatientSummary | null;
  loading?: boolean;
}

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({ summary, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const asOfText = summary?.asOfStatement || 'No recent record is available';
  const summaryText =
    summary?.plainLanguageSummary ||
    'No medical records available yet. Upload your first document to get started.';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header with Dynamic As-Of Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Current Health Summary
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Aggregated overview from all uploaded medical documents
            </p>
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
          <Calendar className="w-3.5 h-3.5 text-health-600 dark:text-health-400" />
          <span>{asOfText}</span>
        </div>
      </div>

      {/* Empathetic Layman Plain-Language Summary */}
      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
        {summaryText}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Records</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {summary?.totalDocumentsCount ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Abnormal Tests</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {summary?.abnormalFindingsCount ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Medicines</div>
            <div className="text-lg font-bold text-teal-700 dark:text-teal-400 mt-0.5">
              {summary?.activeMedicationsCount ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Latest Report</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
              {summary?.latestRecordDate || 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
