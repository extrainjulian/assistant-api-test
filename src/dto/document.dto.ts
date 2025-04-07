/**
 * Annotation levels enum
 */
export enum AnnotationLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

/**
 * Single annotation object structure
 */
export interface Annotation {
  level: AnnotationLevel;
  description: string;
  metadata: string;
}

/**
 * Document data structure
 */
export interface Document {
  id?: string;
  userId: string;
  filePath: string;
  fileName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Document annotations data structure
 */
export interface DocumentAnnotations {
  id?: string;
  documentId: string;
  annotations: Annotation[];
  createdAt?: Date;
}

/**
 * DTO for document creation
 */
export interface CreateDocumentDto {
  userId: string;
  filePath: string;
  fileName: string;
}

/**
 * DTO for document annotations creation
 */
export interface CreateDocumentAnnotationsDto {
  documentId: string;
  annotations: Annotation[];
} 