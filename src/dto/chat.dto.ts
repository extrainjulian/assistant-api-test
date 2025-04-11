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