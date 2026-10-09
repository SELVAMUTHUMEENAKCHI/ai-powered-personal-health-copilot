import { apiRequest } from './api';
import { ChatMessageItem, ChatQueryResponse } from '@health-copilot/shared';

export interface ChatHistoryResponse {
  success: boolean;
  patientId: string;
  messages: ChatMessageItem[];
}

export const ChatService = {
  /**
   * Sends a user query to the AI Health Copilot grounded strictly in medical records.
   */
  async sendMessage(message: string, language = 'en', patientId?: string): Promise<ChatQueryResponse> {
    return apiRequest<ChatQueryResponse>('/chat/message', {
      method: 'POST',
      data: {
        message,
        language,
        patientId,
      },
    });
  },

  /**
   * Fetches chat message history for the active patient.
   */
  async getHistory(patientId?: string): Promise<ChatHistoryResponse> {
    const url = patientId ? `/chat/history?patientId=${encodeURIComponent(patientId)}` : '/chat/history';
    return apiRequest<ChatHistoryResponse>(url, {
      method: 'GET',
    });
  },

  /**
   * Clears the current chat session history.
   */
  async clearHistory(patientId?: string): Promise<{ success: boolean; message: string }> {
    const url = patientId ? `/chat/history?patientId=${encodeURIComponent(patientId)}` : '/chat/history';
    return apiRequest<{ success: boolean; message: string }>(url, {
      method: 'DELETE',
    });
  },
};
