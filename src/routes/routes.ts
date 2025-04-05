import express from 'express';
import { streamContent, streamChatSession } from '../controllers/chat.controller';
import { validateChatRequest } from '../middleware/validation.middleware';

const router = express.Router();

// Renamed route for stateless content generation
router.post('/content', validateChatRequest, streamContent);

// New route for stateful chat sessions
// Note: validateChatRequest might need adjustment if it strictly requires only 'prompt'
router.post('/chat', validateChatRequest, streamChatSession);

export default router; 