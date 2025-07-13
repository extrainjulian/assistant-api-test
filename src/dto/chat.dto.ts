import { OCRResponse } from './ocr.dto';

/**
 * Data Transfer Object for chat requests
 */
export interface ChatRequestDto {
  /**
   * The prompt to send to the AI model
   */
  prompt: string;

  /**
   * Optional ID for the ongoing chat session
   */
  chatId?: string;

    /**
   * Optional list of file paths in the Supabase bucket, used to add a file to the chat that gets processed by mistral OCR
   */
  filePaths?: string[];
}

/**
 * Data Transfer Object for assistant requests
 */
export interface AssistantChatRequestDto {
  /**
   * The user message to send to the assistant
   */
  userMessage: string;

  /**
   * Optional ID for the ongoing chat session
   */
  chatSessionId?: string;

  /**
   * Optional list of file paths in the Supabase bucket
   */
  filePaths?: string[];
}

/**
 * Interface representing Google Genai Part type
 */
export interface Part {
  text?: string;
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  fileData?: {
    mimeType?: string;
    fileUri?: string;
  };
  thought?: boolean;
}

/**
 * Interface representing Google Genai Content type
 */
export interface Content {
  parts?: Part[];
  role?: string;
}

/**
 * Data Transfer Object for chat history from Supabase
 */
export interface ChatHistoryDto {
  id: string;
  userId: string;
  history: Content[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a single message in the Mistral chat history.
 */
export interface MistralMessage {
  role: 'user' | 'assistant' | 'system'; // System role might be useful for initial prompts
  content: string | ContentChunk[]; // String for text-only or ContentChunk array for multimodal
  // Potentially add other fields if needed, like timestamps per message
}

/**
 * Text content chunk for multimodal messages
 */
export interface TextChunk {
  type: 'text';
  text: string;
}

/**
 * Image content chunk for multimodal messages
 */
export interface ImageURLChunk {
  type: 'image_url';
  imageUrl: string;
}

/**
 * Union type for all content chunk types
 */
export type ContentChunk = TextChunk | ImageURLChunk;

/**
 * Data Transfer Object for chat sessions stored in Supabase.
 */
export interface ChatSessionDto {
  id: string;
  userId: string;
  messages: MistralMessage[]; // Array of user/assistant messages
  documents: OCRResponse[]; // Array of OCR results associated with the session
  createdAt: Date;
  updatedAt: Date;
}
