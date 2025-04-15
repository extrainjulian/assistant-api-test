import { Mistral } from '@mistralai/mistralai';
import config from '../config/env';
import { EventStream } from '@mistralai/mistralai/lib/event-streams';
import { CompletionEvent } from '@mistralai/mistralai/models/components/completionevent';
import { MistralMessage } from '../dto/chat.dto'; // Import from DTO
import { OCRResponse, OCRPageObject } from '../dto/ocr.dto'; // Import OCRPageObject
import { Buffer } from 'buffer';

class MistralService {
    private client: Mistral;
    private modelName: string = 'mistral-large-latest';

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
        processedDocuments?: OCRResponse[] // Optional parameter
    ): Promise<EventStream<CompletionEvent>> {
        try {
            let finalMessages = [...messages]; // Start with a copy of the base messages

            // Inject document context if provided
            if (processedDocuments && processedDocuments.length > 0) {
                console.log(`Injecting context from ${processedDocuments.length} document(s) into messages.`);
                const documentContextMessages: MistralMessage[] = [];
                processedDocuments.forEach(doc => {
                    // Use optional chaining for fileName as it might not always be present if the DTO is used elsewhere
                    const docName = doc.fileName ?? 'Unknown Document';
                    if (doc.pages && doc.pages.length > 0) {
                        const combinedText = doc.pages.map((p: OCRPageObject) => p.markdown).join('\n\n'); // Use OCRPageObject
                        // Add a system message for each document's content
                        documentContextMessages.push({
                            role: 'user',
                            content: `--- Document Context: ${docName} ---\n${combinedText}\n--- End Document Context: ${docName} ---` // Use docName
                        });
                    }
                });

                // Insert document context messages before the last user message
                if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].role === 'user') {
                    finalMessages.splice(finalMessages.length - 1, 0, ...documentContextMessages);
                } else {
                    // Fallback: Append if no user message found at the end (shouldn't happen in normal flow)
                    finalMessages.push(...documentContextMessages);
                }
            }

            console.log(`Sending ${finalMessages.length} messages to Mistral.`);
            // Log the final message structure for debugging (optional, can be verbose)
            // console.log("Final messages:", JSON.stringify(finalMessages, null, 2));

            const chatStreamResponse = await this.client.chat.stream({
                model: this.modelName,
                messages: finalMessages, // Use the potentially modified message array
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
