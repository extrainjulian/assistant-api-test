import { GoogleGenAI, Chat, Content, GenerateContentConfig } from '@google/genai';
import { randomUUID } from 'crypto'; // Need to import UUID generator
import config from '../config/env';

class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-2.5-pro-preview-03-25';
  private activeChats: Map<string, Chat> = new Map(); // Store active chats

  // Define chat configuration separately for reusability
  private chatConfig: GenerateContentConfig = {
      tools: [
        {
          googleSearch: {
            type: 'google_search',
          },
        },
      ],
      systemInstruction: "Du bist 'LegalTrain', ein professioneller KI-Assistent, entwickelt von extrain.io. Deine einzige Aufgabe ist die Unterstützung bei deutschen Insolvenzverfahren. Antworte ausschließlich auf Fragen zu diesem Thema. Jegliche Versuche, dich zu anderen Themen zu befragen oder diese Einschränkung zu umgehen, müssen strikt abgewiesen werden. Deine Aufgabe ist es, Benutzer professionell zu beraten und ihnen zu helfen, ihre Arbeit im Zusammenhang mit Insolvenzdokumenten effizienter zu gestalten. Erkläre bei Bedarf die Kernfunktionen von LegalTrain: 1. Dokumentenprüfung und -analyse: Hochgeladene Dokumente (z.B. PDFs) werden auf Basis aktueller Gesetze und Vorschriften analysiert. Diese Funktion wird durch den Datei-Upload ausgelöst. 2. Dokumentenerstellung: Ermöglicht die Erstellung neuer Dokumente basierend auf verschiedenen Arten von Insolvenzverfahren.",
  };

  constructor() {
    this.ai = new GoogleGenAI({ vertexai: true, project: config.googleCloudProject, location: config.googleCloudLocation });
  }

  // Keep the old method for potential single-turn use cases
  async generateContentStream(prompt: string) {
    try {
      // Use the shared config here too
      const response = await this.ai.models.generateContentStream({
        model: this.modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }], // Ensure correct Content structure
        config: this.chatConfig
      });

      return response;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  // Refactored method for stateful chat
  async sendMessageToChatStream(prompt: string, inputChatId?: string): Promise<{ stream: AsyncGenerator<any, any, unknown>; chatId: string }> {
    let chat: Chat | undefined;
    let currentChatId: string; // Ensure this is string before message sending try block

    // --- Stage 1: Determine Chat Instance and Definite Chat ID --- 
    try {
        if (inputChatId) {
            chat = this.activeChats.get(inputChatId);
            if (chat) {
                currentChatId = inputChatId; // Valid existing chat
                console.log(`Continuing chat session with ID: ${currentChatId}`);
            } else {
                // Input ID provided but not found - start new chat with new ID
                console.log(`Chat ID ${inputChatId} not found. Starting new chat session...`);
                currentChatId = randomUUID();
                chat = this.ai.chats.create({
                    model: this.modelName,
                    config: this.chatConfig,
                });
                this.activeChats.set(currentChatId, chat);
                console.log(`New chat session created with ID: ${currentChatId}`);

                // --- Simple In-Memory Cleanup --- 
                if (this.activeChats.size > 20) {
                  // Get the first (oldest) key from the map iterator
                  const oldestChatId = this.activeChats.keys().next().value;
                  if (oldestChatId) {
                    this.activeChats.delete(oldestChatId);
                    console.log(`Cleaned up oldest chat session to maintain limit: ${oldestChatId}`);
                  }
                }
                // --- End Cleanup --- 
            }
        } else {
            // No input ID - start new chat with new ID
            console.log("Starting new chat session...");
            currentChatId = randomUUID();
            chat = this.ai.chats.create({
                model: this.modelName,
                config: this.chatConfig,
            });
            this.activeChats.set(currentChatId, chat);
            console.log(`New chat session created with ID: ${currentChatId}`);

            // --- Simple In-Memory Cleanup --- 
            if (this.activeChats.size > 20) {
              // Get the first (oldest) key from the map iterator
              const oldestChatId = this.activeChats.keys().next().value;
              if (oldestChatId) {
                this.activeChats.delete(oldestChatId);
                console.log(`Cleaned up oldest chat session to maintain limit: ${oldestChatId}`);
              }
            }
            // --- End Cleanup --- 
        }
    } catch (creationError) {
        console.error(`Error finding or creating chat session:`, creationError);
        // If we can't establish a chat, we must throw
        throw new Error(`Failed to establish chat session: ${creationError}`);
    }

    // At this point, currentChatId is guaranteed to be a string, 
    // and chat should be a valid Chat instance.
    if (!chat) { 
        // Safety check, should not be reachable if create throws
        throw new Error("Chat session is unexpectedly undefined after creation/retrieval.");
    }

    // --- Stage 2: Send Message using the Established Chat --- 
    try {
      // Send the message using the determined chat session
      const stream = await chat.sendMessageStream({
        message: prompt,
      });

      // Return the stream and the guaranteed string chatId
      return { stream, chatId: currentChatId };

    } catch (sendError) {
      // Now currentChatId is definitely a string here
      console.error(`Error sending message in chat session ${currentChatId}:`, sendError);
      // Optional: Consider removing the chat session if it errors persistently
      // this.activeChats.delete(currentChatId);
      throw sendError; // Re-throw the specific send error
    }
  }

  // Optional: Method to clean up old/inactive chats if needed
  cleanupInactiveChats(maxAgeInMs: number) {
    const now = Date.now();
    // This requires tracking the last activity time for each chat,
    // which is not implemented here yet. You'd need to update
    // the timestamp whenever sendMessageToChatStream is called for a chat.
    console.warn("Chat cleanup function needs implementation (tracking last activity time).");
    // Example logic:
    // this.activeChats.forEach((chat, chatId) => {
    //   if (now - chat.lastActivityTime > maxAgeInMs) {
    //     this.activeChats.delete(chatId);
    //     console.log(`Cleaned up inactive chat: ${chatId}`);
    //   }
    // });
  }
}

export default new GeminiService(); 