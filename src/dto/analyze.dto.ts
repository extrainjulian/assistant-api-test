/**
 * Data Transfer Object for document analysis requests
 */
export interface AnalyzeRequestDto {
  /**
   * The prompt to send to the AI model
   */
  prompt: string;

  /**
   * The path to the file in Supabase storage
   */
  filePath: string;
} 