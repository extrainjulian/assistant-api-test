import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import mistralService from '../services/mistral.service';
import supabaseService from '../services/supabase.service';
import { ChatRequestDto, MistralMessage, ChatSessionDto } from '../dto/chat.dto'; // Import ChatSessionDto
import { OcrRequestDto, OCRResponse } from '../dto/ocr.dto';
import { legaltrainPrompt } from '../utils/prompts'; // Import the system prompt

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

    try {
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

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        let historyMessages: MistralMessage[] = [];
        let processedDocuments: OCRResponse[] = []; // Store newly processed documents for saving
        let isNewSession = false;

        // 1. Determine/Establish Definitive Session ID & Fetch History
        if (currentSessionIdFromRequest) {
            console.log(`Checking existing session ID: ${currentSessionIdFromRequest}`);
            const session = await supabaseService.getChatSessionById(currentSessionIdFromRequest, jwt);
            if (session) {
                finalSessionId = session.id; // Use the confirmed ID from DB
                historyMessages = Array.isArray(session.messages) ? session.messages : [];
                console.log(`Using existing session ${finalSessionId}. Found ${historyMessages.length} messages.`);
            } else {
                console.warn(`Chat session ${currentSessionIdFromRequest} not found or user unauthorized. Creating a new session.`);
                isNewSession = true;
                // Create a placeholder session to get the real ID first
                const createdSession = await supabaseService.createChatSession(userId, [], [], jwt);
                if (!createdSession || !createdSession.id) {
                    throw new Error('Failed to create a placeholder chat session in the database.');
                }
                finalSessionId = createdSession.id;
                console.log(`Created new placeholder session with ID: ${finalSessionId}`);
            }
        } else {
            isNewSession = true;
            // Create a placeholder session to get the real ID first
            const createdSession = await supabaseService.createChatSession(userId, [], [], jwt);
            if (!createdSession || !createdSession.id) {
                throw new Error('Failed to create a placeholder chat session in the database.');
            }
            finalSessionId = createdSession.id;
            console.log(`Created new placeholder session with ID: ${finalSessionId}`);
        }

        // 2. Set Header with Definitive Session ID
        res.setHeader('X-Chat-Id', finalSessionId);
        console.log(`Set response header X-Chat-Id: ${finalSessionId}`);

        // 3. Process New Files if filePaths are provided (same logic as before)
        const documentContentForPrompt: string[] = [];
        if (filePaths && filePaths.length > 0) {
            console.log(`Processing ${filePaths.length} new file(s) for session ${finalSessionId}...`);
            for (const filePath of filePaths) {
                let tempFilePath: string | null = null;
                try {
                    console.log(`Processing file: ${filePath}`);
                    tempFilePath = await supabaseService.downloadFile(filePath, jwt);
                    const fileContent = fs.readFileSync(tempFilePath);
                    const fileName = path.basename(filePath);
                    const ocrResult = await mistralService.processDocumentOcr(fileContent, fileName, false);
                    processedDocuments.push(ocrResult);
                    if (ocrResult.pages && ocrResult.pages.length > 0) {
                        const combinedText = ocrResult.pages.map(p => p.markdown).join('\n\n');
                        documentContentForPrompt.push(`--- Document: ${fileName} ---\n${combinedText}\n--- End Document: ${fileName} ---`);
                    }
                    console.log(`Successfully processed OCR for ${fileName}`);
                } catch (fileError) {
                    console.error(`Error processing file ${filePath}:`, fileError);
                } finally {
                    if (tempFilePath) {
                        try { fs.unlinkSync(tempFilePath); } catch (e) { console.error(`Error cleaning temp file ${tempFilePath}:`, e); }
                    }
                }
            }
            console.log(`Finished processing ${processedDocuments.length} file(s).`);
        }

        // 4. Construct the final user prompt (same logic as before)
        const finalUserPrompt = documentContentForPrompt.length > 0
            ? `${documentContentForPrompt.join('\n\n')}\n\nUser Query: ${prompt}`
            : prompt;

        // 5. Prepare messages for Mistral API (same logic as before)
        const messagesToMistral: MistralMessage[] = [
            { role: 'system', content: legaltrainPrompt },
            ...historyMessages,
            { role: 'user', content: finalUserPrompt }
        ];

        // Setup response headers for streaming (Content-Type, Transfer-Encoding)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 6. Call the simplified Mistral service
        const stream = await mistralService.sendMessageStream(messagesToMistral);

        // 7. Stream the response back to the client
        for await (const chunk of stream) {
            if (chunk?.data?.choices?.[0]?.delta?.content) {
                const content = chunk.data.choices[0].delta.content;
                res.write(content);
                assistantResponseContent += content;
            }
        }

        res.end(); // End the HTTP response stream

        // 8. Persist Final Session Update (Messages and Documents)
        // The session (ID: finalSessionId) is guaranteed to exist at this point.
        try {
            const newUserMessage: MistralMessage = { role: 'user', content: finalUserPrompt };
            const newAssistantMessage: MistralMessage = { role: 'assistant', content: assistantResponseContent };

            console.log(`Updating session ${finalSessionId} with new messages and documents...`);
            // We always update now, adding the latest exchange and any newly processed docs.
            // For truly new sessions, this adds the first messages/docs to the placeholder.
            // For existing sessions, this appends messages/docs.
            await supabaseService.updateChatSession(
                finalSessionId,
                [newUserMessage, newAssistantMessage], // Append the latest exchange
                processedDocuments, // Append any newly processed documents
                jwt
            );
            console.log(`Session ${finalSessionId} updated successfully with final content.`);

        } catch (dbError) {
            console.error(`Error persisting final update to chat session ${finalSessionId}:`, dbError);
            // Log the error for monitoring.
        }

    } catch (error) {
        console.error('Error processing Mistral chat stream:', error);
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
        res.status(200).json(ocrResult);

    } catch (error) {
        console.error('Error processing Mistral OCR request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process the Mistral OCR request' });
        } else if (!res.writableEnded) {
            res.end();
        }
    } finally {
        if (tempFilePath) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log(`Cleaned up temporary file: ${tempFilePath}`);
            } catch (cleanupError) {
                console.error(`Error cleaning up temporary file ${tempFilePath}:`, cleanupError);
            }
        }
    }
};
