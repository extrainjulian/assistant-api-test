import express from 'express';
import { streamChat } from '../controllers/chat.controller';
import { validateChatRequest } from '../middleware/validation.middleware';

const router = express.Router();

// Chat endpoint for streaming responses
router.post('/chat', validateChatRequest, streamChat);

export default router; 