import { Mistral } from '@mistralai/mistralai';
import config from '../config/env';
import { EventStream } from '@mistralai/mistralai/lib/event-streams';
import { CompletionEvent } from '@mistralai/mistralai/models/components/completionevent';
import { MistralMessage } from '../dto/chat.dto'; // Import from DTO
import { OCRResponse } from '../dto/ocr.dto';
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
     * @param messages The array of messages (including system prompt, history, user message, OCR results).
     * @returns The event stream from the Mistral API.
     */
    async sendMessageStream(messages: MistralMessage[]): Promise<EventStream<CompletionEvent>> {
        try {
            console.log(`Sending ${messages.length} messages to Mistral.`);
            const chatStreamResponse = await this.client.chat.stream({
                model: this.modelName,
                messages: messages,
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

            // Consider deleting the file after processing
            try {
                 await this.client.files.delete({ fileId: uploadedPdf.id });
                 console.log(`Deleted temporary file ${uploadedPdf.id} from Mistral storage.`);
            } catch (deleteError) {
                 console.warn(`Could not delete temporary file ${uploadedPdf.id} from Mistral:`, deleteError);
            }

            // Cast the response to OCRResponse - ensure the actual response structure matches
            return ocrResponse as OCRResponse;
        } catch (error) {
            console.error(`Error processing OCR for file ${fileName}:`, error);
            throw error;
        }
    }
}

export default new MistralService();
