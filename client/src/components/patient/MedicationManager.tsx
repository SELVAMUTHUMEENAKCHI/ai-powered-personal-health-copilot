import React from 'react';
import { Pill, Calendar, Clock, FileText, CheckCircle2, History } from 'lucide-react';
import { MedicalDocument } from '@health-copilot/shared';

interface MedicationManagerProps {
  documents: MedicalDocument[];
  onSelectDocument: (doc: MedicalDocument) => void;
}

export const MedicationManager: React.FC<MedicationManagerProps> = ({
  documents,
  onSelectDocument,
}) => {
  // Aggregate all extracted medicines with source document references
  const allMeds: Array<{
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isActive: boolean;
    sourceDoc: MedicalDocument;
  }> = [];

  documents.forEach((doc) => {
    (doc.medicines || []).forEach((m) => {
      allMeds.push({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        startDate: m.startDate,
        isActive: Boolean((m as { isActive?: boolean }).isActive ?? true),
        sourceDoc: doc,
      });

    });
  });

  const activeMeds = allMeds.filter((m) => m.isActive);
  const pastMeds = allMeds.filter((m) => !m.isActive);

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Medication Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prescriptions, dosages, regimens, and supporting clinical records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
            <span className="text-teal-600 dark:text-teal-400 font-semibold block">Active Regimens</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
              {activeMeds.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 block">Past / Completed</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
              {pastMeds.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block">Supporting Documents</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
              {new Set(allMeds.map((m) => m.sourceDoc.documentId)).size}
            </span>
          </div>
        </div>
      </div>

      {allMeds.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-sm">
          <Pill className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Medications Recorded</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Information not available in the uploaded records. Upload a prescription or discharge summary to automatically extract medications.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Medications */}
          {activeMeds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Currently Active Regimens ({activeMeds.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeMeds.map((med, idx) => (
                  <div
                    key={`active-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200/80 dark:border-teal-900/60 shadow-sm hover:border-teal-400 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{med.name}</h4>
                          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                            {med.dosage || 'Dosage not specified'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Freq: {med.frequency || 'Not available'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Duration: {med.duration || 'Not specified'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <button
                        onClick={() => onSelectDocument(med.sourceDoc)}
                        className="text-health-600 dark:text-health-400 hover:underline flex items-center"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Source: {med.sourceDoc.fileName}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed Medications */}
          {pastMeds.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <History className="w-4 h-4" />
                <span>Past or Completed Medications ({pastMeds.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pastMeds.map((med, idx) => (
                  <div
                    key={`past-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 opacity-80"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{med.name}</h4>
                          <span className="text-[11px] text-slate-500">
                            {med.dosage || 'Dosage not specified'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200">
                        Inactive / Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <div>Freq: {med.frequency || 'Not available'}</div>
                      <div>Duration: {med.duration || 'Not specified'}</div>
                    </div>

                    <button
                      onClick={() => onSelectDocument(med.sourceDoc)}
                      className="text-[11px] text-health-600 dark:text-health-400 hover:underline flex items-center pt-1"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Source: {med.sourceDoc.fileName}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
