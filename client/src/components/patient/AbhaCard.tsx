import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Download, FileCode, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { Patient } from '@health-copilot/shared';
import { apiRequest } from '../../services/api';

interface AbhaCardProps {
  patient: Patient;
}

export const AbhaCard: React.FC<AbhaCardProps> = ({ patient }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [exportingFhir, setExportingFhir] = useState(false);

  const handleMockSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLastSyncTime(
      new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
    setSyncSuccess(true);
    setSyncing(false);
  };

  const handleExportFhir = async () => {
    setExportingFhir(true);
    try {
      const data = await apiRequest<unknown>(`/patients/${patient.patientId}/fhir-bundle`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir-bundle-${patient.patientId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export FHIR bundle:', err);
    } finally {
      setExportingFhir(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ABHA Identity Card */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-800/40 relative overflow-hidden space-y-6">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-teal-400 uppercase font-semibold">
                Ayushman Bharat Digital Mission (ABDM)
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Ayushman Bharat Health Account (ABHA)
              </h2>
            </div>
          </div>

          <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Connected
          </span>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-teal-300 uppercase block">Patient ID</span>
            <span className="text-sm font-bold text-white">{patient.patientId}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-teal-300 uppercase block">Linked ABHA Address / ID</span>
            <span className="text-sm font-bold text-white">
              {patient.abhaId || '91-4829-1092-3841'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[10px] text-teal-300 uppercase block">Last Synchronized</span>
            <span className="text-sm font-semibold text-slate-300">{lastSyncTime}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMockSync}
              disabled={syncing}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync with ABHA Gateway'}</span>
            </button>

            {syncSuccess && (
              <span className="text-xs text-emerald-400 flex items-center font-medium animate-fade-in">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Synchronized!
              </span>
            )}
          </div>

          <button
            onClick={handleExportFhir}
            disabled={exportingFhir}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingFhir ? 'Generating Bundle...' : 'Export FHIR R4 Bundle (JSON)'}</span>
          </button>
        </div>

        {/* Disclaimer Warning */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Educational Demonstration Notice:</strong> This ABHA profile and FHIR bundle are compliant with HL7 FHIR R4 schema standards and designed for ABDM gateway readiness. It is not connected to a live Indian government production health registry.
          </span>
        </div>
      </div>
    </div>
  );
};
