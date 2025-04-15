import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import config from '../config/env';
import { CreateDocumentDto, CreateDocumentAnnotationsDto, Document, DocumentAnnotations, Annotation } from '../dto/document.dto';
import { ChatHistoryDto, Content, ChatSessionDto, MistralMessage } from '../dto/chat.dto';
import { OCRResponse } from '../dto/ocr.dto';

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

  // --- Chat Session Methods ---

  /**
   * Gets a chat session by ID
   * @param sessionId ID of the chat session
   * @param jwt JWT token for user-specific access
   * @returns Chat session or null
   */
  async getChatSessionById(sessionId: string, jwt: string): Promise<ChatSessionDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        // If error is 'PGRST116', it means no rows found, which is expected if the session doesn't exist.
        if (error.code !== 'PGRST116') {
          console.error('Error getting chat session:', error);
        }
        return null;
      }

      // Ensure messages and documents are arrays, even if null in DB
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const documents = Array.isArray(data.documents) ? data.documents : [];


      return {
        id: data.id,
        userId: data.user_id,
        messages: messages,
        documents: documents,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }

  /**
   * Creates a new chat session record in the database
   * @param userId User ID
   * @param userId User ID
   * @param initialMessages Initial messages array
   * @param initialDocuments Initial documents array
   * @param jwt JWT token for user-specific access (used to create authenticated client)
   * @returns Created chat session or null
   */
  async createChatSession(userId: string, initialMessages: MistralMessage[], initialDocuments: OCRResponse[], jwt: string): Promise<ChatSessionDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_sessions')
        .insert({
          user_id: userId, // Use the passed userId parameter
          messages: initialMessages,
          documents: initialDocuments
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat session:', error);
        return null;
      }

      // Ensure messages and documents are arrays after creation
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const documents = Array.isArray(data.documents) ? data.documents : [];

      return {
        id: data.id,
        userId: data.user_id,
        messages: messages,
        documents: documents,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  }

   /**
   * Updates an existing chat session record in the database (appends messages/documents)
   * @param sessionId Chat session ID
   * @param newMessages Messages to append
   * @param newDocuments Documents to append
   * @param jwt JWT token for user-specific access
   * @returns Updated chat session or null
   */
   async updateChatSession(sessionId: string, newMessages: MistralMessage[], newDocuments: OCRResponse[], jwt: string): Promise<ChatSessionDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      // Fetch the current session to append data
      const currentSession = await this.getChatSessionById(sessionId, jwt);
      if (!currentSession) {
        console.error(`Chat session with ID ${sessionId} not found for update.`);
        return null;
      }

      // Ensure current messages/documents are arrays before spreading
      const currentMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
      const currentDocuments = Array.isArray(currentSession.documents) ? currentSession.documents : [];

      const updatedMessages = [...currentMessages, ...newMessages];
      const updatedDocuments = [...currentDocuments, ...newDocuments];

      const { data, error } = await authClient
        .from('chat_sessions')
        .update({
          messages: updatedMessages,
          documents: updatedDocuments
          // updated_at is handled by the trigger
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating chat session:', error);
        return null;
      }

      // Ensure messages and documents are arrays after update
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const documents = Array.isArray(data.documents) ? data.documents : [];

      return {
        id: data.id,
        userId: data.user_id,
        messages: messages,
        documents: documents,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error updating chat session:', error);
      return null;
    }
  }


  // --- Old Chat History Methods (Consider removing or refactoring if chat_sessions replaces this) ---

  /**
   * Gets a chat history by ID
   * @param chatId ID of the chat history
   * @param jwt JWT token for user-specific access
   * @returns Chat history or null
   */
  async getChatHistoryById(chatId: string, jwt: string): Promise<ChatHistoryDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_history')
        .select('*')
        .eq('id', chatId)
        .single();

      if (error) {
        console.error('Error getting chat history:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        history: data.history,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error getting chat history:', error);
      return null;
    }
  }

  /**
   * Creates a new chat history record in the database
   * @param chatId Chat ID
   * @param userId User ID
   * @param history Initial chat history content
   * @param jwt JWT token for user-specific access
   * @returns Created chat history or null
   */
  async createChatHistory(chatId: string, userId: string, history: Content[], jwt: string): Promise<ChatHistoryDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_history')
        .insert({
          id: chatId,
          user_id: userId,
          history: history
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat history:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        history: data.history,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error creating chat history:', error);
      return null;
    }
  }

  /**
   * Updates an existing chat history record in the database
   * @param chatId Chat history ID
   * @param history Updated chat history content
   * @param jwt JWT token for user-specific access
   * @returns Updated chat history or null
   */
  async updateChatHistory(chatId: string, history: Content[], jwt: string): Promise<ChatHistoryDto | null> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_history')
        .update({
          history: history
        })
        .eq('id', chatId)
        .select()
        .single();

      if (error) {
        console.error('Error updating chat history:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        history: data.history,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error updating chat history:', error);
      return null;
    }
  }

  /**
   * Gets all chat histories for a user
   * @param userId User ID
   * @param jwt JWT token for user-specific access
   * @returns Array of chat histories
   */
  async getChatHistoriesByUserId(userId: string, jwt: string): Promise<ChatHistoryDto[]> {
    try {
      const authClient = this.createAuthClient(jwt);

      const { data, error } = await authClient
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error getting chat histories:', error);
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        history: item.history,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
    } catch (error) {
      console.error('Error getting chat histories:', error);
      return [];
    }
  }

  // Convert file paths to file data parts that can be sent to Gemini
  async prepareFilePartsFromPaths(filePaths: string[], jwt: string): Promise<any[]> {
    try {
      if (!filePaths || filePaths.length === 0) {
        return [];
      }

      const fileParts = [];
      
      // Process each file path
      for (const filePath of filePaths) {
        console.log(`Processing file: ${filePath}`);
        
        // Get file data from Supabase
        const fileData = await this.getFileData(filePath, jwt);
        
        // Create a part with the inline data
        fileParts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data
          }
        });
      }
      
      return fileParts;
    } catch (error) {
      console.error('Error preparing file parts:', error);
      throw error;
    }
  }
}

export default new SupabaseService();
