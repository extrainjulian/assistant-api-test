import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import mistralService from '../services/mistral.service';
import supabaseService from '../services/supabase.service';
import { ChatRequestDto, MistralMessage } from '../dto/chat.dto'; // Import ChatSessionDto
import { OcrRequestDto, OCRResponse } from '../dto/ocr.dto';
import { ChatAnalyzeRequestDto } from '../dto/analyze.dto';
import { legaltrainPrompt, documentAnalysisPrompt } from '../utils/prompts'; // Import the system prompts
import { AnalysisResult } from '../utils/types';
import { UsageInfo } from '@mistralai/mistralai/models/components/usageinfo';

/**
 * Stream a chat session with Mistral AI, handling history and document processing.
 * Ensures the correct database session ID is used in the response header.
 * @param req Request with ChatRequestDto (prompt, chatId?, filePaths?)
 * @param res Response to stream content back to the client
 */
export const streamMistralChat = async (req: Request<{}, {}, ChatRequestDto>, res: Response): Promise<void> => {
    let assistantResponseContent = '';
    let currentSessionIdFromRequest: string | undefined = req.body.chatId;
    const { prompt, filePaths } = req.body;
    let finalSessionId: string; // This will hold the definitive DB session ID
    let tokenUsage: UsageInfo | undefined;

    try {
        console.log(`[CONTROLLER] Starting chat stream request ${currentSessionIdFromRequest ? `for session ${currentSessionIdFromRequest}` : '(new session)'}`);
        
        // --- Authentication & User ID ---
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log(`[CONTROLLER] Authentication failed: Missing or invalid JWT token`);
            res.status(401).json({ error: 'Unauthorized: Missing or invalid JWT token' });
            return;
        }
        const jwt = authHeader.split(' ')[1];

        if (!req.user || !req.user.id) {
            console.log(`[CONTROLLER] Authentication failed: User not authenticated`);
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const userId = req.user.id;
        // --- End Authentication ---

        if (!prompt) {
            console.log(`[CONTROLLER] Request validation failed: Missing prompt parameter`);
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        let historyMessages: MistralMessage[] = [];
        let existingDocuments: OCRResponse[] = []; // Store documents from the existing session
        let newlyProcessedDocuments: OCRResponse[] = []; // Store ONLY newly processed documents for saving
        let isNewSession = false;

        // 1. Determine/Establish Definitive Session ID & Fetch History/Documents
        if (currentSessionIdFromRequest) {
            const session = await supabaseService.getChatSessionById(currentSessionIdFromRequest, jwt);
            if (session) {
                finalSessionId = session.id; // Use the confirmed ID from DB
                historyMessages = Array.isArray(session.messages) ? session.messages : [];
                existingDocuments = Array.isArray(session.documents) ? session.documents : []; // Load existing documents
                console.log(`[CONTROLLER] Using existing session ${finalSessionId} with ${historyMessages.length} messages and ${existingDocuments.length} documents`);
            } else {
                console.log(`[CONTROLLER] Session ${currentSessionIdFromRequest} not found, creating new session`);
                isNewSession = true;
                // Create a placeholder session to get the real ID first
                const createdSession = await supabaseService.createChatSession(userId, [], [], jwt);
                if (!createdSession || !createdSession.id) {
                    console.error(`[CONTROLLER] Failed to create chat session in database`);
                    throw new Error('Failed to create a placeholder chat session in the database.');
                }
                finalSessionId = createdSession.id;
            }
        } else {
            isNewSession = true;
            // Create a placeholder session to get the real ID first
            const createdSession = await supabaseService.createChatSession(userId, [], [], jwt);
            if (!createdSession || !createdSession.id) {
                console.error(`[CONTROLLER] Failed to create chat session in database`);
                throw new Error('Failed to create a placeholder chat session in the database.');
            }
            finalSessionId = createdSession.id;
            console.log(`[CONTROLLER] Created new session with ID: ${finalSessionId}`);
        }

        // 2. Set Header with Definitive Session ID
        res.setHeader('Access-Control-Expose-Headers', 'X-Chat-Id');
        res.setHeader('X-Chat-Id', finalSessionId);

        // 3. Process New Files if filePaths are provided (same logic as before)
        if (filePaths && filePaths.length > 0) {
            console.log(`[CONTROLLER] Processing ${filePaths.length} files for session ${finalSessionId}`);
            for (const filePath of filePaths) {
                let tempFilePath: string | null = null;
                try {
                    tempFilePath = await supabaseService.downloadFile(filePath, jwt);
                    const fileContent = fs.readFileSync(tempFilePath);
                    const fileName = path.basename(filePath);
                    const ocrResult = await mistralService.processDocumentOcr(fileContent, fileName, true);
                    newlyProcessedDocuments.push(ocrResult);
                } catch (fileError) {
                    console.error(`[CONTROLLER] Error processing file ${filePath}:`, fileError);
                } finally {
                    if (tempFilePath) {
                        try { 
                            fs.unlinkSync(tempFilePath);
                        } catch (e) { 
                            console.error(`[CONTROLLER] Error cleaning temp file ${tempFilePath}:`, e);
                        }
                    }
                }
            }
            console.log(`[CONTROLLER] Processed ${newlyProcessedDocuments.length} files successfully`);
        }

        // 4. Combine existing and new documents for context
        const allDocumentsForContext = [...existingDocuments, ...newlyProcessedDocuments];

        // 5. Prepare messages for Mistral API (Document context handled by service)
        const messagesToMistral: MistralMessage[] = [
            { role: 'system', content: legaltrainPrompt },
            ...historyMessages,
            { role: 'user', content: prompt } // Use the original prompt here
        ];

        // Setup response headers for streaming (Content-Type, Transfer-Encoding)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 6. Call the Mistral service, passing combined documents for context
        console.log(`[CONTROLLER] Requesting Mistral chat stream with ${messagesToMistral.length} messages and ${allDocumentsForContext.length} documents`);
        const stream = await mistralService.sendMessageStream(
            messagesToMistral,
            allDocumentsForContext // Pass the combined list for context
        );

        // 7. Stream the response back to the client
        for await (const chunk of stream) {
            // Check for token usage in the chunk and update our variable
            if (chunk?.data?.usage) {
                tokenUsage = chunk.data.usage;
            }
            
            if (chunk?.data?.choices?.[0]?.delta?.content) {
                const content = chunk.data.choices[0].delta.content;
                res.write(content);
                assistantResponseContent += content;
            }
        }

        res.end(); // End the HTTP response stream
        console.log(`[CONTROLLER] Chat stream completed successfully`);

        // Track usage in the database if we have token information
        if (tokenUsage) {
            await supabaseService.trackUserUsage(
                userId,
                'chat',
                tokenUsage.totalTokens,
                jwt
            );
            console.log(`[CONTROLLER] Tracked usage of ${tokenUsage.totalTokens} tokens for chat`);
        }

        // 8. Persist Final Session Update (Messages and Documents)
        // The session (ID: finalSessionId) is guaranteed to exist at this point.
        try {
            // Save the ORIGINAL user prompt, not the one potentially modified with context
            const newUserMessage: MistralMessage = { role: 'user', content: prompt };
            const newAssistantMessage: MistralMessage = { role: 'assistant', content: assistantResponseContent };

            await supabaseService.updateChatSession(
                finalSessionId,
                [newUserMessage, newAssistantMessage], // Append the latest exchange
                newlyProcessedDocuments, // Append ONLY newly processed documents
                jwt
            );
            console.log(`[CONTROLLER] Session ${finalSessionId} updated with new messages and ${newlyProcessedDocuments.length} documents`);

        } catch (dbError) {
            console.error(`[CONTROLLER] Error saving chat session ${finalSessionId} to database:`, dbError);
        }

    } catch (error) {
        console.error(`[CONTROLLER] Error processing chat stream:`, error);
        // Ensure we don't try to set headers again if they were already sent
        if (!res.headersSent) {
            // If the error happened before setting the session ID header, we might not have it.
            // Send a generic error.
            res.status(500).json({ error: 'Failed to process the Mistral chat request' });
        } else if (!res.writableEnded) {
            // If headers were sent but the stream didn't finish, end it.
            res.end();
        }
    }
};

// --- processOcr function remains largely the same ---
export const processOcr = async (req: Request<{}, {}, OcrRequestDto>, res: Response): Promise<void> => {
    const { filePath, includeImageBase64 } = req.body;
    let tempFilePath: string | null = null;

    try {
        console.log(`[CONTROLLER] Starting OCR processing for file: ${filePath}`);
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid JWT token' });
            return;
        }
        const jwt = authHeader.split(' ')[1];

        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        tempFilePath = await supabaseService.downloadFile(filePath, jwt);
        const fileContent = fs.readFileSync(tempFilePath);
        const fileName = path.basename(filePath);
        
        const ocrResult = await mistralService.processDocumentOcr(
            fileContent,
            fileName,
            includeImageBase64
        );
        
        console.log(`[CONTROLLER] OCR processing complete for ${fileName}`);
        res.status(200).json(ocrResult);

    } catch (error) {
        console.error(`[CONTROLLER] Error processing OCR request:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process the Mistral OCR request' });
        } else if (!res.writableEnded) {
            res.end();
        }
    } finally {
        if (tempFilePath) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error(`[CONTROLLER] Error cleaning up temporary file ${tempFilePath}:`, cleanupError);
            }
        }
    }
};

/**
 * Analyzes documents associated with a chat session and returns structured analysis
 * @param req Request with chatId path parameter and optional prompt
 * @param res Response with structured analysis results
 */
export const analyzeChatDocuments = async (req: Request<{ chatId: string }, {}, ChatAnalyzeRequestDto>, res: Response): Promise<void> => {
    try {
        const chatId = req.params.chatId;
        const { prompt } = req.body;

        console.log(`[CONTROLLER] Starting document analysis for chat ${chatId}`);

        // --- Authentication & User ID ---
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid JWT token' });
            return;
        }
        const jwt = authHeader.split(' ')[1];

        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const userId = req.user.id;
        // --- End Authentication ---

        // Retrieve chat session to get associated documents
        const chatSession = await supabaseService.getChatSessionById(chatId, jwt);
        if (!chatSession) {
            console.log(`[CONTROLLER] Chat session ${chatId} not found`);
            res.status(404).json({ error: `Chat session with ID ${chatId} not found` });
            return;
        }

        // Ensure this user owns this chat session
        if (chatSession.userId !== userId) {
            console.log(`[CONTROLLER] Access denied: User ${userId} does not own chat ${chatId}`);
            res.status(403).json({ error: 'Unauthorized: You do not have access to this chat session' });
            return;
        }

        // Check if there are documents to analyze
        if (!chatSession.documents || chatSession.documents.length === 0) {
            console.log(`[CONTROLLER] No documents available in chat ${chatId}`);
            res.status(400).json({ error: 'No documents available for analysis in this chat session' });
            return;
        }

        console.log(`[CONTROLLER] Analyzing ${chatSession.documents.length} documents from chat ${chatId}`);

        // Create a user message that includes any additional prompt from the user
        const userContent = prompt 
            ? `${prompt}\n\nDies sind zusätzliche vom Nutzer geforderte Instruktionen, inkludiere sie wenn sie zur Dokumentenanalyse passen.` 
            : `Bitte analysiere die bereitgestellten Dokumente und erstelle eine strukturierte Analyse.`;
        
        const messagesToMistral: MistralMessage[] = [
            { role: 'system', content: documentAnalysisPrompt }, // Use documentAnalysisPrompt as system message
            { role: 'user', content: userContent } // Put the user's additional instructions in the user message
        ];

        // Get the analysis result and usage information
        let analysisResult: AnalysisResult;
        let tokenUsage: UsageInfo | undefined;
        
        try {
            // Use the JSON structured response method
            const response = await mistralService.getStructuredJsonResponse(messagesToMistral, chatSession.documents);
            analysisResult = response.result;
            tokenUsage = response.usage;
            console.log(`[CONTROLLER] Successfully received analysis result`);
            
            // Track usage if available
            if (tokenUsage) {
                await supabaseService.trackUserUsage(
                    userId,
                    'analysis',
                    tokenUsage.totalTokens,
                    jwt
                );
                console.log(`[CONTROLLER] Tracked usage of ${tokenUsage.totalTokens} tokens for analysis`);
            }
        } catch (error) {
            console.error(`[CONTROLLER] Error getting structured response:`, error);
            // Default to empty array if there's an error
            analysisResult = [];
        }

        // Store analysis in the database
        const analysisRecord = await supabaseService.createDocumentAnalysis(
            chatId,
            userId,
            prompt || 'Standard document analysis',
            analysisResult,
            jwt
        );

        if (!analysisRecord) {
            // Even if DB storage fails, still return the analysis to the user
            console.error(`[CONTROLLER] Failed to store analysis record in database`);
        } else {
            console.log(`[CONTROLLER] Analysis saved with ID: ${analysisRecord.id}`);
        }

        // Return the structured analysis results
        res.status(200).json({
            chatId,
            timestamp: new Date().toISOString(),
            analysis: analysisResult,
            recordId: analysisRecord?.id || null,
            tokenUsage: tokenUsage // Include token usage in response
        });

    } catch (error) {
        console.error(`[CONTROLLER] Error analyzing documents:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to analyze the chat documents' });
        }
    }
};