import React, { useState } from 'react';
import { Bell, Plus, CheckCircle2, Circle, Clock, Pill, CalendarCheck, Stethoscope, AlertCircle } from 'lucide-react';

interface ReminderItem {
  id: string;
  title: string;
  type: 'medicine' | 'follow_up' | 'test' | 'appointment';
  time: string;
  date: string;
  isCompleted: boolean;
  notes?: string;
}

export const RemindersList: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([
    {
      id: 'rem-1',
      title: 'Metformin 500mg Morning Dose',
      type: 'medicine',
      time: '08:00 AM',
      date: 'Today',
      isCompleted: false,
      notes: 'Take with breakfast as prescribed in report.',
    },
    {
      id: 'rem-2',
      title: 'Fasting Blood Sugar Repeat Lab Test',
      type: 'test',
      time: '07:30 AM',
      date: 'Tomorrow',
      isCompleted: false,
      notes: 'Requires 8-10 hours fasting prior to sample collection.',
    },
    {
      id: 'rem-3',
      title: 'General Physician Follow-up Visit',
      type: 'follow_up',
      time: '11:00 AM',
      date: 'In 3 Days',
      isCompleted: false,
      notes: 'Review abnormal hemoglobin and glucose findings.',
    },
    {
      id: 'rem-4',
      title: 'Atorvastatin 10mg Bedtime Dose',
      type: 'medicine',
      time: '09:30 PM',
      date: 'Daily',
      isCompleted: true,
      notes: 'Nightly lipid management.',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ReminderItem['type']>('medicine');
  const [newDate, setNewDate] = useState('Today');
  const [newTime, setNewTime] = useState('09:00 AM');

  const toggleComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r))
    );
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      time: newTime,
      isCompleted: false,
    };
    setReminders([newRem, ...reminders]);
    setNewTitle('');
    setShowAddModal(false);
  };

  const getTypeIcon = (type: ReminderItem['type']) => {
    switch (type) {
      case 'medicine':
        return <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'test':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'follow_up':
        return <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'appointment':
        return <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Healthcare Reminders
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track medications, lab tests, appointments, and doctor follow-ups
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-health-600 hover:bg-health-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reminder</span>
          </button>
        </div>

        {/* Reminders List */}
        <div className="space-y-2.5">
          {reminders.map((r) => (
            <div
              key={r.id}
              onClick={() => toggleComplete(r.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                r.isCompleted
                  ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/40 opacity-60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 shadow-sm'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  className="mt-0.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  {r.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(r.type)}
                    <span
                      className={`text-xs font-bold ${
                        r.isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {r.title}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                      {r.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{r.date} at {r.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Create New Reminder
            </h3>

            <form onSubmit={handleAddReminder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650mg after lunch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ReminderItem['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="medicine">Medicine</option>
                    <option value="test">Lab Test</option>
                    <option value="follow_up">Doctor Follow-up</option>
                    <option value="appointment">Appointment</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  Time
                </label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-health-600 hover:bg-health-700 text-white font-semibold"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
