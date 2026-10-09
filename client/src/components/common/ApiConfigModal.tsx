import React, { useState, useEffect } from 'react';
import {
  Server,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X,
  Radio,
  Globe,
} from 'lucide-react';
import {
  getApiBaseUrl,
  isDemoMode,
  setApiConfiguration,
  testBackendHealth,
} from '../../services/api';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [mode, setMode] = useState<'demo' | 'live'>(isDemoMode() ? 'demo' : 'live');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentDemo = isDemoMode();
      setMode(currentDemo ? 'demo' : 'live');
      const currentUrl = getApiBaseUrl();
      setCustomUrl(currentUrl === 'mock' || currentUrl === '/api' ? '' : currentUrl);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!customUrl.trim()) {
      setTestResult({ ok: false, message: 'Please enter a valid backend URL to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testBackendHealth(customUrl.trim());
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (mode === 'demo') {
      setApiConfiguration(null, true);
    } else {
      if (!customUrl.trim()) {
        setTestResult({ ok: false, message: 'Please provide a valid backend URL or select Demo Mode.' });
        return;
      }
      setApiConfiguration(customUrl.trim(), false);
    }
    if (onConfigChanged) onConfigChanged();
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                API Backend Connection
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose between In-Browser Demo Mode or a Live API Backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: In-Browser Demo Mode */}
          <div
            onClick={() => setMode('demo')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'demo'
                ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                    In-Browser Demo Mode (Recommended for GitHub Pages)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    Standalone
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Runs offline without needing a backend server. Pre-loaded with Ramesh Kumar&apos;s
                  diabetic care timeline, Priya Sundaram&apos;s records, OCR extraction simulation,
                  and grounded AI Copilot chat.
                </p>
              </div>
              <input
                type="radio"
                name="api_mode"
                checked={mode === 'demo'}
                onChange={() => setMode('demo')}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Option 2: Live Backend Server */}
          <div
            onClick={() => setMode('live')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              mode === 'live'
                ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                    <Globe className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                    Connect Live Backend API
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Live Server
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Connect to your deployed Node.js / Express backend server (on Render, Railway,
                  AWS, or local <code>http://localhost:5000</code>).
                </p>
              </div>
              <input
                type="radio"
                name="api_mode"
                checked={mode === 'live'}
                onChange={() => setMode('live')}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
            </div>

            {mode === 'live' && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Backend API Base URL
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="e.g. https://my-health-backend.onrender.com/api"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !customUrl.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Radio className="w-3.5 h-3.5" />
                    )}
                    <span>Test Ping</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] flex items-center space-x-2 ${
                      testResult.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
