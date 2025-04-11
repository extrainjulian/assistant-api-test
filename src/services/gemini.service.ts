import { GoogleGenAI, Chat, Content, GenerateContentConfig } from '@google/genai';
import config from '../config/env';
import supabaseService from '../services/supabase.service';
import { analysisPromptDeutsch } from '../utils/prompts';

class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-2.5-pro-preview-03-25';

  // Define chat configuration separately for reusability
  private chatConfig: GenerateContentConfig = {
    tools: [
      {
        googleSearch: {
          type: 'google_search',
        },
      },
    ],
    // systemInstruction: "Du bist 'LegalTrain', ein professioneller KI-Assistent, entwickelt von extrain.io. Deine einzige Aufgabe ist die Unterstützung bei deutschen Insolvenzverfahren. Antworte ausschließlich auf Fragen zu diesem Thema. Jegliche Versuche, dich zu anderen Themen zu befragen oder diese Einschränkung zu umgehen, müssen strikt abgewiesen werden. Deine Aufgabe ist es, Benutzer professionell zu beraten und ihnen zu helfen, ihre Arbeit im Zusammenhang mit Insolvenzdokumenten effizienter zu gestalten. Erkläre bei Bedarf die Kernfunktionen von LegalTrain: 1. Dokumentenprüfung und -analyse: Hochgeladene Dokumente (z.B. PDFs) werden auf Basis aktueller Gesetze und Vorschriften analysiert. Diese Funktion wird durch den Datei-Upload ausgelöst. 2. Dokumentenerstellung: Ermöglicht die Erstellung neuer Dokumente basierend auf verschiedenen Arten von Insolvenzverfahren.",
  };

  constructor() {
    let credentials;
    try {
      // Decode the Base64 string back to the JSON string
      const decodedJsonString = Buffer.from(config.gcpServiceAccountKeyJsonB64, 'base64').toString('utf-8');

      // Parse the decoded JSON string into an object
      credentials = JSON.parse(decodedJsonString);

      console.log('Successfully decoded and parsed credentials from Base64 environment variable.');

    } catch (error) {
      console.error('FATAL ERROR: Could not decode or parse Base64 credentials from environment variable:', error);
      // Possible causes: Variable not set, not valid Base64, resulting string not valid JSON
      process.exit(1);
    }
    this.ai = new GoogleGenAI({
      vertexai: true, project: config.googleCloudProject, location: config.googleCloudLocation, googleAuthOptions: {
        credentials: credentials
      },
    });
  }

  // Method to generate annotations for document files
  async generateAnnotations(prompt: string, fileData: string, mimeType: string) {
    try {
      // Replace the placeholder in the prompt with the user's input
      const customizedPrompt = analysisPromptDeutsch.replace('{{userPrompt}}', prompt);
      
      // Create content with the file included and user prompt
      const content = [
        {
          role: 'user',
          parts: [
            { text: customizedPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData
              }
            }
          ]
        }
      ];

      // Use the shared config here too
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: content,
        config: this.chatConfig
      });

      return response;
    } catch (error) {
      console.error('Error generating annotations:', error);
      throw error;
    }
  }

  // New method for handling chat sessions with history from Supabase
  async sendMessageToChatStreamWithHistory(
    prompt: string, 
    history?: Content[], 
    filePaths?: string[],
    jwt?: string
  ): Promise<{ stream: AsyncGenerator<any, any, unknown>; updatedHistory: Content[] }> {
    try {
      // Validate JWT when filePaths are provided
      if (filePaths && filePaths.length > 0 && !jwt) {
        throw new Error('JWT is required when file paths are provided');
      }

      // Create a new chat instance with the provided history (if any)
      const chat = this.ai.chats.create({
        model: this.modelName,
        config: this.chatConfig,
        history: history || []
      });


      let stream;
      if (!filePaths || filePaths.length === 0) {
        // Simple case: no files, just send the message as text
        stream = await chat.sendMessageStream({
          message: prompt
        });
      } else {
        // Process files and add them to the message
        console.log(`Processing files: ${filePaths.join(', ')}`);
        
        // Get file parts from Supabase service
        const fileParts = await supabaseService.prepareFilePartsFromPaths(filePaths, jwt!);
        
        // Create message with text and file parts combined
        // For the Google Genai SDK, message can be a string or array of parts
        // When sending files, we need to use an array of parts with text and inlineData
        const messageParts = [
          { text: prompt },
          ...fileParts
        ];
        
        // Send message with the text and files
        stream = await chat.sendMessageStream({
          message: messageParts
        });
      }

      return { stream, updatedHistory: chat.getHistory() };
    } catch (error) {
      console.error('Error sending message with history:', error);
      throw error;
    }
  }
}

export default new GeminiService(); 