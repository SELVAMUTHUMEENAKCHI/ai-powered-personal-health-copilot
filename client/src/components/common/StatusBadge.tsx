import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'Completed':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${pad}`}
        >
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
          Completed
        </span>
      );

    case 'Failed':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${pad}`}
        >
          <XCircle className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
          Failed
        </span>
      );

    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${pad}`}
        >
          <AlertCircle className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
          High
        </span>
      );

    case 'LOW':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${pad}`}
        >
          <AlertCircle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
          Low
        </span>
      );

    case 'NORMAL':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${pad}`}
        >
          Normal
        </span>
      );

    case 'Queued':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${pad}`}
        >
          <Clock className="w-3 h-3 mr-1 text-slate-500" />
          Queued
        </span>
      );

    case 'OCR Processing':
    case 'Extracting':
    case 'Validating':
    case 'Saved':
    default:
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 ${pad}`}
        >
          <Loader2 className="w-3 h-3 mr-1 text-cyan-600 dark:text-cyan-400 animate-spin" />
          {status}
        </span>
      );
  }
};
