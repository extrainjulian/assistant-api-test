/**
 * Types for analysis responses from Mistral
 */

/**
 * Annotation level indicating severity of findings
 */
export type AnnotationLevel = 'info' | 'warning' | 'error';

/**
 * Annotation structure as defined in analysisPromptDeutsch
 */
export interface Annotation {
  /**
   * Severity level of the annotation
   */
  level: AnnotationLevel;
  
  /**
   * A concise explanation of the issue and a concrete suggestion for improvement
   */
  description: string;
  
  /**
   * Unique identifier for the location in the document that the annotation refers to
   */
  metadata: string;
}

/**
 * Combined type that can be used for either analysis response structure
 */
export type AnalysisResult = Annotation[]