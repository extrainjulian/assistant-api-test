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
                console.log(`Injecting context from ${processedDocuments.length} document(s) into messages.`);
                const documentContextMessages: (UserMessage & { role: 'user' })[] = [];
                
                processedDocuments.forEach(doc => {
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

            console.log(`Sending ${sdkMessages.length} messages to Mistral.`);
            
            const chatStreamResponse = await this.client.chat.stream({
                model: this.modelName,
                messages: sdkMessages,
            });
            
            console.log('Received stream response from Mistral.');
            return chatStreamResponse;
        } catch (error) {
            console.error('Error calling Mistral chat stream API:', error);
            throw error; // Re-throw for upstream handling
        }
    }

    // Method to upload a file buffer to Mistral and process OCR
    async processDocumentOcr(fileContent: Buffer, fileName: string, includeImageBase64: boolean = false): Promise<OCRResponse> { // Explicit return type
        try {
            console.log(`Uploading file ${fileName} to Mistral for OCR...`);

            const uploadedPdf = await this.client.files.upload({
                file: { fileName: fileName, content: fileContent },
                purpose: "ocr"
            });
            console.log(`File ${fileName} uploaded successfully. File ID: ${uploadedPdf.id}`);

            const signedUrlResponse = await this.client.files.getSignedUrl({ fileId: uploadedPdf.id });
            console.log(`Obtained signed URL for file ID ${uploadedPdf.id}`);

            console.log(`Processing OCR for signed URL...`); // Removed URL logging for brevity/security
            const ocrResponse = await this.client.ocr.process({
                model: "mistral-ocr-latest",
                document: { type: "document_url", documentUrl: signedUrlResponse.url },
                includeImageBase64: includeImageBase64
            });
            console.log(`OCR processing successful for file ${fileName}.`);

            // Add fileName to the response object as it's useful later
            const responseWithFilename = { ...ocrResponse, fileName: fileName } as OCRResponse;


            // Consider deleting the file after processing
            try {
                 await this.client.files.delete({ fileId: uploadedPdf.id });
                 console.log(`Deleted temporary file ${uploadedPdf.id} from Mistral storage.`);
            } catch (deleteError) {
                 console.warn(`Could not delete temporary file ${uploadedPdf.id} from Mistral:`, deleteError);
            }

            // Cast the response to OCRResponse - ensure the actual response structure matches
            return responseWithFilename; // Return the augmented response
        } catch (error) {
            console.error(`Error processing OCR for file ${fileName}:`, error);
            throw error;
        }
    }
}

export default new MistralService();
