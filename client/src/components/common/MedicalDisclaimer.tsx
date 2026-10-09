import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MedicalDisclaimerProps {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ compact = false }) => {
  return (
    <div
      className={`bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 flex items-start space-x-3 shadow-sm ${
        compact ? 'p-2.5 text-[11px]' : 'p-3.5 text-xs'
      }`}
    >
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="leading-relaxed">
        <strong>Medical Notice:</strong> This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice.
      </p>
    </div>
  );
};
