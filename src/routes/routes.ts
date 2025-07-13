import express from 'express';
import { analyzeDocument } from '../controllers/analyzeController';
import { streamAssistantChat } from '../controllers/assistant.controller';
import { 
    streamMistralChat, 
    processOcr,
    analyzeChatDocuments
} from '../controllers/mistral.controller';
import {
    validateAnalyzeRequest,
    validateAssistantRequest,
    validateChatRequest,
    validateOcrRequest,
    validateChatAnalyzeRequest
} from '../middleware/validation.middleware';

const router = express.Router();

router.post('/analyze', validateAnalyzeRequest, analyzeDocument);
router.post('/assistant', validateAssistantRequest, streamAssistantChat);

router.post('/mistral/chat', validateChatRequest, streamMistralChat);
router.post('/mistral/ocr', validateOcrRequest, processOcr);
router.post('/mistral/chat/:chatId/analyze', validateChatAnalyzeRequest, analyzeChatDocuments);

export default router;
