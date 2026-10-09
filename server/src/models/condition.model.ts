import mongoose, { Document, Schema } from 'mongoose';

export interface ICondition extends Document {
  resourceType: 'Condition';
  patientId: string;
  documentId: string;
  code: string;
  clinicalStatus: 'active' | 'resolved' | 'remission';
  recordedDate: Date | null;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConditionSchema = new Schema<ICondition>(
  {
    resourceType: {
      type: String,
      default: 'Condition',
      required: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    clinicalStatus: {
      type: String,
      enum: ['active', 'resolved', 'remission'],
      default: 'active',
    },
    recordedDate: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const ConditionModel = mongoose.model<ICondition>('Condition', ConditionSchema);
