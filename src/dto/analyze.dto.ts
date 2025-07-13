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

/**
 * Data Transfer Object for chat document analysis requests
 */
export interface ChatAnalyzeRequestDto {
  /**
   * Additional prompt to guide the analysis
   */
  prompt: string;
}

/**
 * Structure for document analysis result
 */
export interface DocumentAnalysisResult {
  /**
   * ID of the analysis record
   */
  id: string;
  
  /**
   * ID of the chat session
   */
  chatId: string;
  
  /**
   * User ID who requested the analysis
   */
  userId: string;
  
  /**
   * Prompt used for the analysis
   */
  prompt: string;
  
  /**
   * Structured analysis result as an array of annotations
   * with level, description, and optional metadata
   */
  analysis: Array<{
    level: 'info' | 'warning' | 'error';
    description: string;
    metadata?: string;
  }>;
  
  /**
   * Timestamp when analysis was created
   */
  createdAt: Date;
}