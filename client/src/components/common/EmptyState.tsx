import React from 'react';
import { FileUp, FileText } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Medical Records Yet',
  message = 'No medical records available yet. Upload your first document to get started.',
  actionText = 'Upload First Document',
  onAction,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner">
        <FileText className="w-7 h-7" />
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
      </div>

      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 bg-health-600 hover:bg-health-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-sm hover:shadow"
        >
          <FileUp className="w-4 h-4" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
