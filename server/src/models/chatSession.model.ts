import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage {
  sender: 'user' | 'assistant';
  message: string;
  language: string;
  sources?: Array<{
    documentId: string;
    reportDate?: string | null;
    title?: string;
  }>;
  timestamp: Date;
}

export interface IChatSession extends Document {
  patientId: string;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    sources: [
      {
        documentId: { type: String, required: true },
        reportDate: { type: String, default: null },
        title: { type: String, default: null },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Health Discussion',
    },
    messages: [ChatMessageSchema],
  },
  { timestamps: true }
);

export const ChatSessionModel = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
