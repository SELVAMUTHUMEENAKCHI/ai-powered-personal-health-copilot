import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Send query to AI copilot
router.post('/message', authenticate, ChatController.sendMessage);

// Get chat consultation history
router.get('/history', authenticate, ChatController.getHistory);

// Clear chat consultation history
router.delete('/history', authenticate, ChatController.clearHistory);

export default router;
