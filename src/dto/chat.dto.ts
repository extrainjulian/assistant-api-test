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