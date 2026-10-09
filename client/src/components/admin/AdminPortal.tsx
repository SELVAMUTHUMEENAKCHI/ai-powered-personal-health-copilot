import React, { useState, useEffect } from 'react';
import { MedicalDocument, PatientSummary } from '@health-copilot/shared';
import { AdminApiService, PatientListItem } from '../../services/admin.service';
import { PatientApiService } from '../../services/patient.service';
import { DocumentApiService } from '../../services/document.service';
import { PatientSearchTable } from './PatientSearchTable';
import { BulkUploadModal } from './BulkUploadModal';
import { DocumentReviewModal } from './DocumentReviewModal';
import { StatusBadge } from '../common/StatusBadge';
import { HealthSummaryCard } from '../patient/HealthSummaryCard';
import { HealthTimeline } from '../patient/HealthTimeline';
import { EmptyState } from '../common/EmptyState';
import { RefreshCw } from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'documents'>('patients');
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<MedicalDocument | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<PatientSummary | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<MedicalDocument[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [docFilter, setDocFilter] = useState<'all' | 'unreviewed'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [patRes, docList] = await Promise.all([
        AdminApiService.listPatients(),
        AdminApiService.listAllDocuments(),
      ]);
      setPatients(patRes.patients);
      setDocuments(docList);
    } catch (err) {
      setError((err as Error).message || 'Failed to load administrative oversight data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedSummary(null);
      setSelectedDocs([]);
      return;
    }

    const loadInspect = async () => {
      try {
        setInspectLoading(true);
        const [sum, docs] = await Promise.all([
          PatientApiService.getSummary(selectedPatientId),
          DocumentApiService.listDocuments(selectedPatientId),
        ]);
        setSelectedSummary(sum);
        setSelectedDocs(docs);
      } catch (err) {
        console.error('Failed to load inspected patient:', err);
      } finally {
        setInspectLoading(false);
      }
    };

    loadInspect();
  }, [selectedPatientId]);

  const totalPatients = patients.length;
  const totalDocuments = documents.length;
  const pendingReviews = documents.filter((d) => !d.adminReviewed).length;
  const verifiedCount = documents.filter((d) => d.adminReviewed).length;

  const filteredDocuments = documents.filter((d) => {
    if (docFilter === 'unreviewed') return !d.adminReviewed;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Admin Action Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Clinical Administration Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
              Staff & Clinician View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registry oversight, automated multi-tenant ingestion, and human-in-the-loop review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Registry and Document Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsBulkOpen(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Bulk Ingestion (Multi-File)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Registered Patients</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalPatients}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">ABDM-compatible records</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Documents</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalDocuments}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Stored in GridFS storage</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Clinical Review</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">
            {pendingReviews}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-1">Needs human verification</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Verified Records</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            {verifiedCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Reviewed by clinician</div>
        </div>
      </div>

      {/* Selected Patient Drawer / Inspection */}
      {selectedPatientId && (
        <div className="p-5 bg-teal-50/70 dark:bg-slate-900/90 rounded-2xl border-2 border-teal-500/40 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Patient Inspection Mode:
              </span>
              <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg bg-teal-600 text-white shadow-sm">
                {selectedPatientId}
              </span>
            </div>
            <button
              onClick={() => setSelectedPatientId(null)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
            >
              Exit Patient Inspection ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HealthSummaryCard summary={selectedSummary} loading={inspectLoading} />
            <HealthTimeline
              documents={selectedDocs}
              onSelectDocument={(doc) => setReviewingDoc(doc)}
              loading={inspectLoading}
            />
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'patients'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Patient Registry ({totalPatients})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'documents'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Clinical Documents Oversight ({totalDocuments})
            </button>
          </div>

          {activeTab === 'documents' && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setDocFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  docFilter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-700 font-bold text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                All Documents ({totalDocuments})
              </button>
              <button
                onClick={() => setDocFilter('unreviewed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  docFilter === 'unreviewed'
                    ? 'bg-amber-100 dark:bg-amber-950/60 font-bold text-amber-800 dark:text-amber-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Needs Review ({pendingReviews})
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Patient Registry */}
        {activeTab === 'patients' && (
          <PatientSearchTable
            onSelectPatient={(pid) => {
              setSelectedPatientId(pid);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Tab 2: Document Oversight & Review Queue */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredDocuments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title={docFilter === 'unreviewed' ? 'All records verified!' : 'No documents indexed'}
                  message={
                    docFilter === 'unreviewed'
                      ? 'There are currently no documents pending clinician review.'
                      : 'Upload medical records using the Bulk Ingestion Hub.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Document / File</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Report Date</th>
                      <th className="py-3 px-4">Extracted Parameters</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDocuments.map((doc) => (
                      <tr
                        key={doc.documentId}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                            {doc.fileName}
                          </div>
                          <div className="font-mono text-xs text-slate-400">{doc.documentId}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {doc.patientName}
                          </div>
                          <div className="font-mono text-xs text-teal-600 dark:text-teal-400">
                            {doc.patientId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                            {doc.documentType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                          {doc.reportDate || 'Unspecified'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {doc.abnormalFindings?.length || 0}
                            </span>
                            <span className="text-slate-400">tests</span>
                            <span>•</span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {doc.medicines?.length || 0}
                            </span>
                            <span className="text-slate-400">meds</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {doc.adminReviewed ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setReviewingDoc(doc)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm inline-flex items-center gap-1.5"
                          >
                            <span>{doc.adminReviewed ? 'Edit / View' : 'Review & Verify'}</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onBatchCompleted={() => loadData()}
      />

      {/* Document Review Screen Modal */}
      <DocumentReviewModal
        document={reviewingDoc}
        isOpen={!!reviewingDoc}
        onClose={() => setReviewingDoc(null)}
        onReviewSaved={() => loadData()}
      />
    </div>
  );
};
