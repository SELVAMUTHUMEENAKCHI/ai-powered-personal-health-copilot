import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';

export class ChatController {
  /**
   * Handles conversational query to AI copilot with strict patient isolation.
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, language = 'en', patientId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MESSAGE',
            message: 'A message query is required.',
          },
        });
        return;
      }

      // Resolve scoped patient ID
      let targetPatientId: string | null = null;
      if (req.user?.role === 'patient') {
        targetPatientId = req.user.patientId;
      } else if (req.user?.role === 'admin') {
        targetPatientId = patientId || 'PT-1001';
      }

      if (!targetPatientId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PATIENT_ID',
            message: 'Target Patient ID must be specified for chat consultation.',
          },
        });
        return;
      }

      const result = await ChatService.processMessage(
        targetPatientId,
        message.trim(),
        language
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves chat message history for the authenticated patient.
   */
  static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let targetPatientId: string | null = null;
      if (req.user?.role === 'patient') {
        targetPatientId = req.user.patientId;
      } else if (req.user?.role === 'admin') {
        targetPatientId = (req.query.patientId as string) || 'PT-1001';
      }

      if (!targetPatientId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PATIENT_ID', message: 'Target Patient ID required.' },
        });
        return;
      }

      const session = await ChatService.getHistory(targetPatientId);

      res.status(200).json({
        success: true,
        patientId: targetPatientId,
        messages: session ? session.messages : [],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clears chat session history.
   */
  static async clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let targetPatientId: string | null = null;
      if (req.user?.role === 'patient') {
        targetPatientId = req.user.patientId;
      } else if (req.user?.role === 'admin') {
        targetPatientId = (req.query.patientId as string) || 'PT-1001';
      }

      if (!targetPatientId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PATIENT_ID', message: 'Target Patient ID required.' },
        });
        return;
      }

      await ChatService.clearHistory(targetPatientId);

      res.status(200).json({
        success: true,
        message: 'Chat history cleared successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
