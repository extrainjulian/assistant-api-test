import express from 'express';
import { analyzeDocument } from '../controllers/analyzeController';
import { streamAssistantChat } from '../controllers/assistant.controller';
import { validateAnalyzeRequest, validateAssistantRequest } from '../middleware/validation.middleware';

const router = express.Router();
router.post('/analyze', validateAnalyzeRequest, analyzeDocument);

router.post('/assistant', validateAssistantRequest, streamAssistantChat);

export default router; 