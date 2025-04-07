import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import config from '../config/env';
import { CreateDocumentDto, CreateDocumentAnnotationsDto, Document, DocumentAnnotations, Annotation } from '../dto/document.dto';

class SupabaseService {
  private supabase;

  constructor() {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
      process.exit(1);
    }

    // Create a client with anon key - for public operations only
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  /**
   * Creates an authenticated Supabase client using a JWT token
   * @param jwt The JWT token from the Authorization header
   * @returns An authenticated Supabase client
   */
  private createAuthClient(jwt: string) {
    // Create a new client with the JWT for authenticated operations
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });
  }

  /**
   * Downloads a file from Supabase Storage to a temporary location
   * @param filePath Path to the file in the bucket
   * @param jwt JWT token for user-specific access
   * @param bucketName Name of the storage bucket
   * @returns Path to the temporary file
   */
  async downloadFile(filePath: string, jwt: string, bucketName: string = 'document-storage'): Promise<string> {
    try {
      // Create a temporary file path
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, path.basename(filePath));

      // Create an authenticated client with the JWT
      const authClient = this.createAuthClient(jwt);

      // Download the file from Supabase
      const { data, error } = await authClient.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        throw new Error(`Error downloading file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Supabase');
      }

      // Convert the blob to a buffer and write to temporary file
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);

      return tempFilePath;
    } catch (error) {
      console.error('Error downloading file from Supabase:', error);
      throw error;
    }
  }

  /**
   * Gets the file data from Supabase as a base64 encoded string
   * @param filePath Path to the file in the bucket
   * @param jwt JWT token for user-specific access
   * @param bucketName Name of the storage bucket
   * @returns File data and MIME type
   */
  async getFileData(filePath: string, jwt: string, bucketName: string = 'document-storage'): Promise<{ data: string, mimeType: string }> {
    try {
      // Create an authenticated client with the JWT
      const authClient = this.createAuthClient(jwt);

      // Download the file from Supabase
      const { data, error } = await authClient.storage
        .from(bucketName)
        .download(filePath);

      if (error) {
        throw new Error(`Error downloading file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Supabase');
      }

      // Convert the blob to a base64 string
      const arrayBuffer = await data.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Determine MIME type based on file extension
      const mimeType = this.getMimeType(filePath);

      return {
        data: base64,
        mimeType
      };
    } catch (error) {
      console.error('Error getting file data from Supabase:', error);
      throw error;
    }
  }

  /**
   * Gets a MIME type based on file extension
   * @param filePath Path to the file
   * @returns MIME type string
   */
  private getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
      case '.docx':
        return 'application/msword';
      case '.xls':
      case '.xlsx':
        return 'application/vnd.ms-excel';
      case '.ppt':
      case '.pptx':
        return 'application/vnd.ms-powerpoint';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Creates a new document record in the database
   * @param documentData Document data to create
   * @param jwt JWT token for user-specific access
   * @returns Created document or null
   */
  async createDocument(documentData: CreateDocumentDto, jwt: string): Promise<Document | null> {
    try {
      const authClient = this.createAuthClient(jwt);
      
      const { data, error } = await authClient
        .from('documents')
        .insert({
          user_id: documentData.userId,
          file_path: documentData.filePath,
          file_name: documentData.fileName
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating document:', error);
        return null;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        filePath: data.file_path,
        fileName: data.file_name,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  }

  /**
   * Creates document annotations in the database
   * @param annotationsData Annotations data to create
   * @param jwt JWT token for user-specific access
   * @returns Created annotations or null
   */
  async createDocumentAnnotations(annotationsData: CreateDocumentAnnotationsDto, jwt: string): Promise<DocumentAnnotations | null> {
    try {
      const authClient = this.createAuthClient(jwt);
      
      const { data, error } = await authClient
        .from('document_annotations')
        .insert({
          document_id: annotationsData.documentId,
          annotations: annotationsData.annotations
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating document annotations:', error);
        return null;
      }
      
      return {
        id: data.id,
        documentId: data.document_id,
        annotations: data.annotations,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error creating document annotations:', error);
      return null;
    }
  }

  /**
   * Gets all documents for a user
   * @param userId User ID to get documents for
   * @param jwt JWT token for user-specific access
   * @returns Array of documents
   */
  async getDocumentsByUserId(userId: string, jwt: string): Promise<Document[]> {
    try {
      const authClient = this.createAuthClient(jwt);
      
      const { data, error } = await authClient
        .from('documents')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error getting documents:', error);
        return [];
      }
      
      return data.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        filePath: doc.file_path,
        fileName: doc.file_name,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at)
      }));
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  }

  /**
   * Gets annotations for a document
   * @param documentId Document ID to get annotations for
   * @param jwt JWT token for user-specific access
   * @returns Document annotations or null
   */
  async getDocumentAnnotations(documentId: string, jwt: string): Promise<DocumentAnnotations | null> {
    try {
      const authClient = this.createAuthClient(jwt);
      
      const { data, error } = await authClient
        .from('document_annotations')
        .select('*')
        .eq('document_id', documentId)
        .single();
      
      if (error) {
        console.error('Error getting document annotations:', error);
        return null;
      }
      
      return {
        id: data.id,
        documentId: data.document_id,
        annotations: data.annotations,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error getting document annotations:', error);
      return null;
    }
  }

  /**
   * Gets documents by file path for a specific user
   * @param filePath Path to the file in storage
   * @param userId User ID to filter by
   * @param jwt JWT token for user-specific access
   * @returns Array of documents
   */
  async getDocumentsByPath(filePath: string, userId: string, jwt: string): Promise<Document[]> {
    try {
      const authClient = this.createAuthClient(jwt);
      
      const { data, error } = await authClient
        .from('documents')
        .select('*')
        .eq('file_path', filePath)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error getting documents by path:', error);
        return [];
      }
      
      return data.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        filePath: doc.file_path,
        fileName: doc.file_name,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at)
      }));
    } catch (error) {
      console.error('Error getting documents by path:', error);
      return [];
    }
  }
}

export default new SupabaseService(); 