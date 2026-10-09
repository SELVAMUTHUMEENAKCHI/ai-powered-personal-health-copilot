import React, { useState, useEffect } from 'react';
import { PatientListItem, AdminApiService } from '../../services/admin.service';
import { EmptyState } from '../common/EmptyState';

interface PatientSearchTableProps {
  onSelectPatient: (patientId: string) => void;
}

export const PatientSearchTable: React.FC<PatientSearchTableProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminApiService.listPatients(searchQuery);
      setPatients(res.patients);
    } catch (err) {
      setError((err as Error).message || 'Failed to load patient registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(query);
    }, 250);
    const interval = setInterval(() => {
      fetchPatients(query);
    }, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search Bar & Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by Patient ID (e.g. PT-1001), full name, or ABHA ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-2">
          <span>Total Registered:</span>
          <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono">
            {patients.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading patient registry...</div>
        ) : patients.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No patients match your query"
              message="Try searching with a different Patient ID (e.g. PT-1001, PT-1002) or clear the search filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">ABHA ID</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Medical Documents</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients.map((p) => (
                  <tr
                    key={p.patientId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs uppercase">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            {p.name}
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                              {p.patientId}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 capitalize">
                            {p.gender} • Born {new Date(p.dob).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span>{p.abhaId}</span>
                        {p.abhaStatus === 'verified' && (
                          <span
                            title="ABDM ABHA Verified"
                            className="inline-flex items-center text-teal-600 dark:text-teal-400 text-[10px] font-semibold uppercase"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {p.documentCount}
                        </span>
                        <span className="text-xs text-slate-400">files indexed</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {p.lastRecordDate ? new Date(p.lastRecordDate).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectPatient(p.patientId)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <span>View Records</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
    </div>
  );
};
