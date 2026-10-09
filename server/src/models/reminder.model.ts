import mongoose, { Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  patientId: string;
  title: string;
  reminderType: 'medication' | 'follow_up' | 'lab_test' | 'appointment';
  dueDate: Date;
  frequency: 'once' | 'daily' | 'weekly';
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reminderType: {
      type: String,
      enum: ['medication', 'follow_up', 'lab_test', 'appointment'],
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['once', 'daily', 'weekly'],
      default: 'once',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export const ReminderModel = mongoose.model<IReminder>('Reminder', ReminderSchema);
