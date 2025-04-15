import express from 'express';
import { analyzeDocument } from '../controllers/analyzeController';
import { streamAssistantChat } from '../controllers/assistant.controller';
import { streamMistralChat, processOcr } from '../controllers/mistral.controller'; // Import the new OCR controller
import {
    validateAnalyzeRequest,
    validateAssistantRequest,
    validateChatRequest,
    validateOcrRequest // Import the new OCR validator
} from '../middleware/validation.middleware';

const router = express.Router();
router.post('/analyze', validateAnalyzeRequest, analyzeDocument);
router.post('/assistant', validateAssistantRequest, streamAssistantChat);

// Add the Mistral chat route
router.post('/mistral/chat', validateChatRequest, streamMistralChat);

// Add the new Mistral OCR route
router.post('/mistral/ocr', validateOcrRequest, processOcr);

export default router;
