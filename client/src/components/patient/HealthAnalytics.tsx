import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Activity, AlertCircle, Info } from 'lucide-react';
import { MedicalDocument } from '@health-copilot/shared';

interface HealthAnalyticsProps {
  documents: MedicalDocument[];
}

export const HealthAnalytics: React.FC<HealthAnalyticsProps> = ({ documents }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('glucose');

  // Extract all test values across documents sorted chronologically
  const extractMetricData = (metricKeywords: string[], targetUnit?: string) => {
    const dataPoints: Array<{
      date: string;
      value: number;
      unit: string;
      testName: string;
      refLow?: number | null;
      refHigh?: number | null;
      docName: string;
    }> = [];

    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = new Date(a.reportDate || a.uploadedAt).getTime();
      const dateB = new Date(b.reportDate || b.uploadedAt).getTime();
      return dateA - dateB;
    });

    sortedDocs.forEach((doc) => {
      const docDate = doc.reportDate || new Date(doc.uploadedAt).toISOString().split('T')[0];
      (doc.abnormalFindings || []).forEach((finding) => {
        const nameLower = finding.testName.toLowerCase();
        const matches = metricKeywords.some((kw) => nameLower.includes(kw));
        if (matches && typeof finding.value === 'number') {
          dataPoints.push({
            date: docDate,
            value: finding.value,
            unit: finding.unit || targetUnit || '',
            testName: finding.testName,
            refLow: finding.referenceRange?.low,
            refHigh: finding.referenceRange?.high,
            docName: doc.fileName,
          });
        }
      });
    });

    return dataPoints;
  };

  const glucoseData = extractMetricData(['glucose', 'sugar', 'fbs', 'ppbs', 'rbs'], 'mg/dL');
  const hemoglobinData = extractMetricData(['hemoglobin', 'hb'], 'g/dL');
  const bpData = extractMetricData(['blood pressure', 'bp', 'systolic'], 'mmHg');
  const cholesterolData = extractMetricData(['cholesterol', 'lipid', 'triglyceride'], 'mg/dL');

  const metricsConfig: Record<
    string,
    {
      title: string;
      data: typeof glucoseData;
      unit: string;
      normalLow?: number;
      normalHigh?: number;
      color: string;
    }
  > = {
    glucose: {
      title: 'Blood Glucose (Fasting / Random)',
      data: glucoseData,
      unit: 'mg/dL',
      normalLow: 70,
      normalHigh: 110,
      color: '#0d9488', // teal-600
    },
    hemoglobin: {
      title: 'Hemoglobin (Hb)',
      data: hemoglobinData,
      unit: 'g/dL',
      normalLow: 12.0,
      normalHigh: 16.0,
      color: '#e11d48', // rose-600
    },
    cholesterol: {
      title: 'Lipid Profile / Cholesterol',
      data: cholesterolData,
      unit: 'mg/dL',
      normalLow: 125,
      normalHigh: 200,
      color: '#6366f1', // indigo-500
    },
    bp: {
      title: 'Blood Pressure (Systolic)',
      data: bpData,
      unit: 'mmHg',
      normalLow: 90,
      normalHigh: 120,
      color: '#0284c7', // sky-600
    },
  };

  const activeConfig = metricsConfig[selectedMetric] || metricsConfig.glucose;
  const hasEnoughData = activeConfig.data.length >= 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Longitudinal Health Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track clinical biomarker trends extracted strictly from your medical reports
              </p>
            </div>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(metricsConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedMetric === key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {config.title.split(' ')[0]} ({config.data.length})
              </button>
            ))}
          </div>
        </div>

        {/* Chart View or Strict Zero-Hallucination Fallback */}
        {hasEnoughData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">
                {activeConfig.title} ({activeConfig.unit})
              </span>
              <span>{activeConfig.data.length} recorded data point(s)</span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeConfig.data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit={` ${activeConfig.unit}`} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${val} ${activeConfig.unit}`, activeConfig.title]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  {activeConfig.normalLow && (
                    <ReferenceLine
                      y={activeConfig.normalLow}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `Low Ref (${activeConfig.normalLow})`, fill: '#10b981', fontSize: 10 }}
                    />
                  )}
                  {activeConfig.normalHigh && (
                    <ReferenceLine
                      y={activeConfig.normalHigh}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{ value: `High Ref (${activeConfig.normalHigh})`, fill: '#f43f5e', fontSize: 10 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={activeConfig.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Not enough historical data to show a trend.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Trend lines require at least two separate medical records with {activeConfig.title} values. Currently only {activeConfig.data.length} measurement is available in your records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
