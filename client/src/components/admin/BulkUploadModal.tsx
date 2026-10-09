import React, { useState, useEffect, useRef } from 'react';
import { AdminApiService } from '../../services/admin.service';
import { UploadJob } from '@health-copilot/shared';
import { StatusBadge } from '../common/StatusBadge';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCompleted?: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onBatchCompleted,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<UploadJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setActiveJobId(null);
      setJobStatus(null);
      setError(null);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
  }, [isOpen]);

  // Polling loop for active job
  useEffect(() => {
    if (!activeJobId) return;

    const poll = async () => {
      try {
        const job = await AdminApiService.getJobStatus(activeJobId);
        setJobStatus(job);

        if (job.status === 'completed' || job.status === 'failed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (onBatchCompleted) onBatchCompleted();
        }
      } catch (err) {
        console.error('Job polling error:', err);
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeJobId, onBatchCompleted]);

  if (!isOpen) return null;

  const handleFilesAdded = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;
    const newFiles = Array.from(incomingFiles);
    const combined = [...selectedFiles, ...newFiles].slice(0, 20); // max 20 files
    setSelectedFiles(combined);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const parsePatientId = (fileName: string): string | null => {
    const match = fileName.match(/^(PT-\d+)/i);
    return match ? match[1].toUpperCase() : null;
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one document to ingest.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await AdminApiService.bulkUpload(selectedFiles);
      setActiveJobId(res.jobId);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit bulk upload batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const isJobActive = !!activeJobId && !!jobStatus;
  const isFinished = jobStatus?.status === 'completed' || jobStatus?.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Bulk Clinical Ingestion Hub</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold font-mono">
                Admin Batch Ingestion
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest up to 20 patient records simultaneously with automatic registry routing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm">
              {error}
            </div>
          )}

          {!isJobActive ? (
            <>
              {/* Guidance Notice */}
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl text-xs text-sky-800 dark:text-sky-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Filename Convention:</span>
                </div>
                <p>
                  Files must begin with the target Patient ID prefix (e.g.{' '}
                  <code className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-sky-200 dark:border-sky-700">
                    PT-1001_blood_test.pdf
                  </code>
                  ,{' '}
                  <code className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-sky-200 dark:border-sky-700">
                    PT-1002_rx_tamil.jpg
                  </code>
                  ). The ingestion engine isolates failures so one corrupt file never halts the batch.
                </p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesAdded(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 bg-slate-50/50 dark:bg-slate-800/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(e) => handleFilesAdded(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="font-medium text-slate-900 dark:text-white text-sm">
                  Drag and drop multiple documents here, or <span className="text-teal-600 underline">browse</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Supported formats: PDF, DOCX, JPG, PNG (up to 20 files, 50MB each)
                </div>
              </div>

              {/* Staged File List Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Staged for Ingestion ({selectedFiles.length}/20)
                    </span>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-rose-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedFiles.map((file, idx) => {
                      const detectedId = parsePatientId(file.name);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-slate-400">#{idx + 1}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {detectedId ? (
                              <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono font-bold text-[11px]">
                                {detectedId}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-medium">
                                No PT-ID prefix
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveFile(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Live Batch Job Monitor */
            <div className="space-y-4">
              {/* Batch KPI Tiles */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Total Files</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {jobStatus.totalFiles}
                  </div>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800/60">
                  <div className="text-xs text-teal-600 dark:text-teal-400">Processed</div>
                  <div className="text-xl font-bold font-mono text-teal-700 dark:text-teal-300">
                    {jobStatus.processedFiles}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Succeeded</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {jobStatus.successCount}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60">
                  <div className="text-xs text-rose-600 dark:text-rose-400">Failed</div>
                  <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
                    {jobStatus.failedCount}
                  </div>
                </div>
              </div>

              {/* Per-File Job Progress Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Batch Job: <code className="font-mono">{jobStatus.jobId}</code>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {!isFinished && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping inline-block" />
                    )}
                    <span className="capitalize font-semibold text-slate-600 dark:text-slate-300">
                      {jobStatus.status.replace('_', ' ')}
                    </span>
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {jobStatus.files.map((file, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {file.fileName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>Patient: {file.patientId || 'Unresolved'}</span>
                          {file.documentId && <span>• Doc: {file.documentId}</span>}
                        </div>
                        {file.errorReason && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400">
                            Reason: {file.errorReason}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <StatusBadge status={file.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          {!isJobActive ? (
            <>
              <div className="text-xs text-slate-400">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) ready to submit`
                  : 'Select files to proceed'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={submitting || selectedFiles.length === 0}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Submitting Batch...' : `Start Ingestion (${selectedFiles.length})`}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                {isFinished
                  ? 'Batch processing complete. Patient registries updated.'
                  : 'Processing documents in background...'}
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors"
              >
                {isFinished ? 'Done' : 'Close Monitor'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
