import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { DocumentApiService } from '../../services/document.service';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Check for legacy .doc extension
    if (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
      setErrorMsg('Limited support for legacy DOC. Please convert to PDF or DOCX.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const startUploadAndPoll = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setJobStatus('Queued');

    try {
      // 1. Trigger Upload Endpoint
      const response = await DocumentApiService.upload(selectedFile);
      setJobStatus('Processing your medical document...');

      // 2. Poll Job Queue until Completed or Failed
      const jobId = response.jobId;
      const pollInterval = setInterval(async () => {
        try {
          const job = await DocumentApiService.getJobStatus(jobId);
          const currentFile = job.files[0];

          if (currentFile) {
            setJobStatus(currentFile.status);

            if (currentFile.status === 'Completed') {
              clearInterval(pollInterval);
              setUploading(false);
              setSuccessMsg('Document processed successfully.');
              onUploadSuccess();
            } else if (currentFile.status === 'Failed') {
              clearInterval(pollInterval);
              setUploading(false);
              setErrorMsg(
                currentFile.errorReason ||
                  'Unable to process this document. Please check the file and try again.'
              );
            }
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setUploading(false);
          setErrorMsg('Unable to process this document. Please check the file and try again.');
        }
      }, 1500);
    } catch (err) {
      setUploading(false);
      setErrorMsg((err as Error).message || 'Unable to process this document. Please check the file and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Upload Medical Document
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PDF, DOCX, JPG, PNG up to 50MB
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        {!uploading && !successMsg && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
              dragActive
                ? 'border-health-500 bg-health-50/50 dark:bg-health-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-health-500/70 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.doc"
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to browse or drag and drop file here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports pathology reports, prescriptions, discharge summaries
              </p>
            </div>
          </div>
        )}

        {/* Processing State Animation */}
        {uploading && (
          <div className="py-8 text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-health-600 animate-spin" />
              <FileText className="w-6 h-6 text-health-600 dark:text-health-400 absolute" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Processing your medical document...
              </p>
              <p className="text-xs font-mono text-health-600 dark:text-health-400 mt-1 font-semibold">
                Status: {jobStatus || 'Queued'}
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              {successMsg}
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Your timeline and health summary have been updated with extracted clinical parameters.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          {!successMsg ? (
            <>
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startUploadAndPoll}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center space-x-2 bg-health-600 hover:bg-health-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Upload & Analyze</span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="bg-health-600 hover:bg-health-700 text-white font-medium px-5 py-2 rounded-xl text-xs transition-colors shadow-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
