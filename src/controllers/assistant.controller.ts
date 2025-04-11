import { Request, Response } from 'express';
import geminiService from '../services/gemini.service';
import supabaseService from '../services/supabase.service';
import { AssistantChatRequestDto, Content } from '../dto/chat.dto';
import { randomUUID } from 'crypto';

/**
 * Stream a chat session with the assistant, using Supabase for chat history persistence
 * @param req Request with AssistantChatRequestDto
 * @param res Response to stream content back to the client
 */
export const streamAssistantChat = async (req: Request<{}, {}, AssistantChatRequestDto>, res: Response): Promise<void> => {
    try {
        const { userMessage, chatSessionId, filePaths } = req.body;

        // Setup response headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Access-Control-Expose-Headers', 'X-Chat-Id');

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization header with Bearer token is required' });
            return;
        }

        const jwt = authHeader.substring(7);

        if (!req.user || !req.user.id) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const userId = req.user.id;

        let history: Content[] = [];

        if (chatSessionId) {
            console.log(`Fetching chat history for session ${chatSessionId}`);
            const chatHistory = await supabaseService.getChatHistoryById(chatSessionId, jwt);

            if (!chatHistory) {
                console.log(`Chat history not found, creating new session instead of using ${chatSessionId}`);
            } else {
                history = chatHistory.history;
            }
        }

        // Add the user's message to the history with any file references
        const userContent: Content = {
            role: 'user',
            parts: [{ text: userMessage }]
        };

        // Ensure parts is always defined as an array
        if (!userContent.parts) {
            userContent.parts = [];
        }

        // If there are file paths, add them to the user message parts in the history
        if (filePaths && filePaths.length > 0) {
            // Add file references to history for context
            // Note: We don't store actual file data in history, just paths for reference
            filePaths.forEach(filePath => {
                if (userContent.parts) {
                    userContent.parts.push({
                        text: `[Referenced file: ${filePath.split('/').pop()}]`
                    });
                }
            });
        }



        const newChatId = randomUUID()
        if (chatSessionId) {
            // Send the chat ID back via a custom header
            res.setHeader('X-Chat-Id', chatSessionId);
        } else {
            res.setHeader('X-Chat-Id', newChatId);
        }

        // Send the message to Gemini
        const { stream, updatedHistory } = await geminiService.sendMessageToChatStreamWithHistory(
            userMessage,
            history,
            filePaths,
            jwt
        );

        // Variable to collect the model's response for saving to history
        let modelResponseText = '';

        // Stream the response back to the client
        for await (const chunk of stream) {
            if (chunk.candidates &&
                chunk.candidates[0]?.content?.parts &&
                chunk.candidates[0].content.parts[0]?.text) {
                const text = chunk.candidates[0].content.parts[0].text;
                modelResponseText += text;
                res.write(text);
            }
        }


        const modelContent: Content = {
            role: 'model',
            parts: [{ text: modelResponseText }]
        };
        updatedHistory.push(modelContent);

        if (chatSessionId) {
            await supabaseService.updateChatHistory(chatSessionId, updatedHistory, jwt);
        } else {
            console.log('Creating new chat history');
            await supabaseService.createChatHistory(newChatId, userId, updatedHistory, jwt);
        }

        res.end();
    } catch (error) {
        console.error('Error processing assistant chat stream:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process the assistant chat request' });
            return;
        }
        if (!res.writableEnded) {
            res.end();
        }
    }
}; 