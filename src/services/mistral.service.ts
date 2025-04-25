import { Mistral } from '@mistralai/mistralai';
import config from '../config/env';
import { EventStream } from '@mistralai/mistralai/lib/event-streams';
import { CompletionEvent } from '@mistralai/mistralai/models/components/completionevent';
import { ContentChunk } from '@mistralai/mistralai/models/components/contentchunk';
import { TextChunk } from '@mistralai/mistralai/models/components/textchunk';
import { ImageURLChunk } from '@mistralai/mistralai/models/components/imageurlchunk';
import { UserMessage } from '@mistralai/mistralai/models/components/usermessage';
import { SystemMessage } from '@mistralai/mistralai/models/components/systemmessage';
import { AssistantMessage } from '@mistralai/mistralai/models/components/assistantmessage';
import { ChatCompletionStreamRequestMessages } from '@mistralai/mistralai/models/components/chatcompletionstreamrequest';
import { MistralMessage } from '../dto/chat.dto';
import { OCRResponse, OCRPageObject } from '../dto/ocr.dto';
import { Buffer } from 'buffer';
import { AnalysisResult } from '../utils/types';
import { UsageInfo } from '@mistralai/mistralai/models/components/usageinfo';

class MistralService {
    private client: Mistral;
    private modelName: string = 'pixtral-large-latest';

    constructor() {
        if (!config.mistralApiKey) {
            console.error('FATAL ERROR: MISTRAL_API_KEY is required but not provided in environment variables');
            process.exit(1);
        }
        this.client = new Mistral({ apiKey: config.mistralApiKey });
        console.log('Mistral client initialized successfully.');
    }

    /**
     * Processes chat messages, optionally fetching history and processing documents.
     * Returns the stream and context needed for the controller to update the session.
     * @param userMessage The user's current message.
     * Sends prepared messages to the Mistral chat stream API.
     * Optionally includes processed document context as system messages.
     * @param messages The base array of messages (system prompt, history, user message).
     * @param processedDocuments Optional array of OCR results to inject as context.
     * @returns The event stream from the Mistral API.
     */
    async sendMessageStream(
        messages: MistralMessage[],
        processedDocuments?: OCRResponse[]
    ): Promise<EventStream<CompletionEvent>> {
        try {
            console.log(`[MISTRAL] Starting chat stream with ${messages.length} messages and ${processedDocuments?.length || 0} documents`);

            // Convert our messages to SDK-compatible format
            const sdkMessages: ChatCompletionStreamRequestMessages[] = messages.map(msg => {
                if (typeof msg.content === 'string') {
                    // For string content
                    if (msg.role === 'system') {
                        return {
                            role: 'system',
                            content: msg.content
                        } as SystemMessage & { role: 'system' };
                    } else if (msg.role === 'assistant') {
                        return {
                            role: 'assistant',
                            content: msg.content
                        } as AssistantMessage & { role: 'assistant' };
                    } else {
                        return {
                            role: 'user',
                            content: msg.content
                        } as UserMessage & { role: 'user' };
                    }
                } else {
                    // For multimodal content
                    // Convert our ContentChunk[] to SDK's ContentChunk[]
                    const sdkContent: ContentChunk[] = msg.content.map(chunk => {
                        if (chunk.type === 'text') {
                            return {
                                type: 'text',
                                text: chunk.text
                            } as TextChunk & { type: 'text' };
                        } else {
                            return {
                                type: 'image_url',
                                imageUrl: chunk.imageUrl
                            } as ImageURLChunk & { type: 'image_url' };
                        }
                    });

                    if (msg.role === 'user') {
                        return {
                            role: 'user',
                            content: sdkContent
                        } as UserMessage & { role: 'user' };
                    } else if (msg.role === 'assistant') {
                        return {
                            role: 'assistant',
                            content: sdkContent
                        } as AssistantMessage & { role: 'assistant' };
                    } else {
                        return {
                            role: 'system',
                            content: sdkContent
                        } as SystemMessage & { role: 'system' };
                    }
                }
            });
            
            // Inject document context if provided
            if (processedDocuments && processedDocuments.length > 0) {
                console.log(`[MISTRAL] Processing ${processedDocuments.length} documents for context`);
                const documentContextMessages: (UserMessage & { role: 'user' })[] = [];
                
                processedDocuments.forEach((doc) => {
                    const docName = doc.fileName ?? 'Unknown Document';
                    
                    if (doc.pages && doc.pages.length > 0) {
                        // Create multimodal content with both text and images
                        const multimodalContent: ContentChunk[] = [];
                        
                        // Add document header as text
                        multimodalContent.push({
                            type: 'text',
                            text: `--- Document Context: ${docName} ---`
                        } as TextChunk & { type: 'text' });
                        
                        // Process each page
                        doc.pages.forEach((page: OCRPageObject) => {
                            // Add page text
                            multimodalContent.push({
                                type: 'text',
                                text: page.markdown
                            } as TextChunk & { type: 'text' });
                            
                            // Add page images if available
                            if (page.images && page.images.length > 0) {
                                page.images.forEach(image => {
                                    if (image.imageBase64) {
                                        multimodalContent.push({
                                            type: 'image_url',
                                            imageUrl: image.imageBase64.startsWith('data:') 
                                                ? image.imageBase64 
                                                : `data:image/jpeg;base64,${image.imageBase64}`
                                        } as ImageURLChunk & { type: 'image_url' });
                                    }
                                });
                            }
                        });
                        
                        // Add document footer as text
                        multimodalContent.push({
                            type: 'text',
                            text: `--- End Document Context: ${docName} ---`
                        } as TextChunk & { type: 'text' });
                        
                        // Create user message with multimodal content
                        documentContextMessages.push({
                            role: 'user',
                            content: multimodalContent
                        } as UserMessage & { role: 'user' });
                    } else {
                        console.warn(`[MISTRAL] Document ${docName} has no pages to process`);
                    }
                });

                // Find the position to insert - before the last user message
                const lastUserIndex = sdkMessages.findIndex(
                    (msg, i) => msg.role === 'user' && i === sdkMessages.length - 1
                );
                
                if (lastUserIndex !== -1) {
                    // Insert before the last user message
                    sdkMessages.splice(lastUserIndex, 0, ...documentContextMessages);
                } else {
                    // Fallback: Append at the end
                    sdkMessages.push(...documentContextMessages);
                }
            }

            const chatStreamResponse = await this.client.chat.stream({
                model: this.modelName,
                messages: sdkMessages,
            });
            
            console.log(`[MISTRAL] Successfully established chat stream`);
            return chatStreamResponse;
        } catch (error) {
            console.error(`[MISTRAL] Error creating chat stream:`, error);
            throw error; // Re-throw for upstream handling
        }
    }

    // Method to upload a file buffer to Mistral and process OCR
    async processDocumentOcr(fileContent: Buffer, fileName: string, includeImageBase64: boolean = false): Promise<OCRResponse> { // Explicit return type
        try {
            console.log(`[MISTRAL] Starting OCR processing for "${fileName}"`);

            const uploadedPdf = await this.client.files.upload({
                file: { fileName: fileName, content: fileContent },
                purpose: "ocr"
            });
            console.log(`[MISTRAL] File uploaded successfully. File ID: ${uploadedPdf.id}`);

            const signedUrlResponse = await this.client.files.getSignedUrl({ fileId: uploadedPdf.id });

            console.log(`[MISTRAL] Processing OCR with${includeImageBase64 ? '' : 'out'} image base64 data`);
            const ocrResponse = await this.client.ocr.process({
                model: "mistral-ocr-latest",
                document: { type: "document_url", documentUrl: signedUrlResponse.url },
                includeImageBase64: includeImageBase64
            });

            // Add fileName to the response object as it's useful later
            const responseWithFilename = { ...ocrResponse, fileName: fileName } as OCRResponse;

            // Consider deleting the file after processing
            try {
                 await this.client.files.delete({ fileId: uploadedPdf.id });
                 console.log(`[MISTRAL] Deleted temporary file from Mistral storage`);
            } catch (deleteError) {
                 console.warn(`[MISTRAL] Could not delete temporary file ${uploadedPdf.id}:`, deleteError);
            }

            console.log(`[MISTRAL] OCR processing completed for "${fileName}" (${responseWithFilename.pages?.length || 0} pages)`);
            return responseWithFilename; // Return the augmented response
        } catch (error) {
            console.error(`[MISTRAL] Error processing OCR for "${fileName}":`, error);
            throw error;
        }
    }

    /**
     * Sends messages to Mistral API with JSON response format
     * @param messages Array of messages to send to the API
     * @param processedDocuments Optional array of documents for context
     * @returns Structured JSON response and usage information
     */
    async getStructuredJsonResponse(
        messages: MistralMessage[],
        processedDocuments?: OCRResponse[]
    ): Promise<{ result: AnalysisResult, usage?: UsageInfo }> {
        try {
            console.log(`[MISTRAL] Starting structured JSON request with ${messages.length} messages and ${processedDocuments?.length || 0} documents`);
            
            // Convert our messages to SDK-compatible format
            const sdkMessages = this.convertMessagesToSdkFormat(messages);
            
            // Inject document context if provided
            if (processedDocuments && processedDocuments.length > 0) {
                this.injectDocumentContext(sdkMessages, processedDocuments);
            }

            // Use the non-streaming complete endpoint with JSON response format
            const chatResponse = await this.client.chat.complete({
                model: this.modelName,
                messages: sdkMessages,
                responseFormat: { type: 'json_object' },
            });
            
            // Extract and parse JSON response
            if (chatResponse?.choices?.[0]?.message?.content) {
                try {
                    // Check that content is a string before parsing
                    const content = chatResponse.choices[0].message.content;
                    if (typeof content === 'string') {
                        const jsonContent = JSON.parse(content) as AnalysisResult;
                        console.log(`[MISTRAL] Successfully received and parsed JSON response`);
                        
                        if (chatResponse.usage) {
                            console.log(`[MISTRAL] Token usage for analysis: ${JSON.stringify(chatResponse.usage)}`);
                        }
                        
                        // Return both the result and usage data
                        return { 
                            result: jsonContent,
                            usage: chatResponse.usage 
                        };
                    } else {
                        console.error(`[MISTRAL] Error: Response content is not a string`);
                        throw new Error('Mistral response content is not a string and cannot be parsed as JSON');
                    }
                } catch (parseError) {
                    console.error(`[MISTRAL] Error parsing JSON response:`, parseError);
                    throw new Error('Failed to parse Mistral response as JSON');
                }
            } else {
                console.error(`[MISTRAL] Error: Response missing expected content`);
                throw new Error('Mistral response did not contain expected content');
            }
        } catch (error) {
            console.error('[MISTRAL] Error getting structured JSON response:', error);
            throw error;
        }
    }

    /**
     * Helper method to convert our message format to SDK format
     */
    private convertMessagesToSdkFormat(messages: MistralMessage[]): ChatCompletionStreamRequestMessages[] {
        return messages.map(msg => {
            if (typeof msg.content === 'string') {
                // For string content
                if (msg.role === 'system') {
                    return {
                        role: 'system',
                        content: msg.content
                    } as SystemMessage & { role: 'system' };
                } else if (msg.role === 'assistant') {
                    return {
                        role: 'assistant',
                        content: msg.content
                    } as AssistantMessage & { role: 'assistant' };
                } else {
                    return {
                        role: 'user',
                        content: msg.content
                    } as UserMessage & { role: 'user' };
                }
            } else {
                // For multimodal content
                // Convert our ContentChunk[] to SDK's ContentChunk[]
                const sdkContent: ContentChunk[] = msg.content.map(chunk => {
                    if (chunk.type === 'text') {
                        return {
                            type: 'text',
                            text: chunk.text
                        } as TextChunk & { type: 'text' };
                    } else {
                        return {
                            type: 'image_url',
                            imageUrl: chunk.imageUrl
                        } as ImageURLChunk & { type: 'image_url' };
                    }
                });

                if (msg.role === 'user') {
                    return {
                        role: 'user',
                        content: sdkContent
                    } as UserMessage & { role: 'user' };
                } else if (msg.role === 'assistant') {
                    return {
                        role: 'assistant',
                        content: sdkContent
                    } as AssistantMessage & { role: 'assistant' };
                } else {
                    return {
                        role: 'system',
                        content: sdkContent
                    } as SystemMessage & { role: 'system' };
                }
            }
        });
    }

    /**
     * Helper method to inject document context into messages
     */
    private injectDocumentContext(
        sdkMessages: ChatCompletionStreamRequestMessages[], 
        processedDocuments: OCRResponse[]
    ): void {
        console.log(`[MISTRAL] Injecting context from ${processedDocuments.length} document(s)`);
        const documentContextMessages: (UserMessage & { role: 'user' })[] = [];
        
        processedDocuments.forEach((doc, index) => {
            const docName = doc.fileName ?? 'Unknown Document';
            
            if (doc.pages && doc.pages.length > 0) {
                // Create multimodal content with both text and images
                const multimodalContent: ContentChunk[] = [];
                
                // Add document header as text
                multimodalContent.push({
                    type: 'text',
                    text: `--- Document Context: ${docName} ---`
                } as TextChunk & { type: 'text' });
                
                // Process each page
                doc.pages.forEach((page: OCRPageObject, pageIndex) => {
                    // Add page text
                    multimodalContent.push({
                        type: 'text',
                        text: page.markdown
                    } as TextChunk & { type: 'text' });
                    
                    // Add page images if available
                    if (page.images && page.images.length > 0) {
                        page.images.forEach(image => {
                            if (image.imageBase64) {
                                multimodalContent.push({
                                    type: 'image_url',
                                    imageUrl: image.imageBase64.startsWith('data:') 
                                        ? image.imageBase64 
                                        : `data:image/jpeg;base64,${image.imageBase64}`
                                } as ImageURLChunk & { type: 'image_url' });
                            }
                        });
                    }
                });
                
                // Add document footer as text
                multimodalContent.push({
                    type: 'text',
                    text: `--- End Document Context: ${docName} ---`
                } as TextChunk & { type: 'text' });
                
                // Create user message with multimodal content
                documentContextMessages.push({
                    role: 'user',
                    content: multimodalContent
                } as UserMessage & { role: 'user' });
            } else {
                console.warn(`[MISTRAL] Document ${docName} has no pages to process`);
            }
        });

        // Find the position to insert - before the last user message
        const lastUserIndex = sdkMessages.findIndex(
            (msg, i) => msg.role === 'user' && i === sdkMessages.length - 1
        );
        
        if (lastUserIndex !== -1) {
            // Insert before the last user message
            sdkMessages.splice(lastUserIndex, 0, ...documentContextMessages);
        } else {
            // Fallback: Append at the end
            sdkMessages.push(...documentContextMessages);
        }
        
        console.log(`[MISTRAL] Added ${documentContextMessages.length} document context messages to request`);
    }
}

export default new MistralService();
