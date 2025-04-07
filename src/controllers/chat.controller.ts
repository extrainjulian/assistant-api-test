import { Request, Response } from 'express';
import geminiService from '../services/gemini.service';
import supabaseService from '../services/supabase.service';
import { ChatRequestDto } from '../dto/chat.dto';
import { AnalyzeRequestDto } from '../dto/analyze.dto';
import { Annotation, AnnotationLevel } from '../dto/document.dto';
import path from 'path';

export const streamContent = async (req: Request<{}, {}, { prompt: string }>, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // Added charset=utf-8
    res.setHeader('Transfer-Encoding', 'chunked');
    
    const response = await geminiService.generateContentStream(prompt);
    
    for await (const chunk of response) {
      if (chunk.candidates && 
          chunk.candidates[0]?.content?.parts && 
          chunk.candidates[0].content.parts[0]?.text) {
        const text = chunk.candidates[0].content.parts[0].text;
        res.write(text);
      }
    }
    
    res.end();
  } catch (error) {
    console.error('Error processing content stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process the content request' });
      return;
    }
    if (!res.writableEnded) {
        res.end();
    }
  }
};

export const streamChatSession = async (req: Request<{}, {}, ChatRequestDto>, res: Response): Promise<void> => {
  try {
    const { prompt, chatId } = req.body;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // Added charset=utf-8
    res.setHeader('Transfer-Encoding', 'chunked');
    // Expose the header for the client to read
    res.setHeader('Access-Control-Expose-Headers', 'X-Chat-Id'); 

    const { stream, chatId: newOrExistingChatId } = await geminiService.sendMessageToChatStream(prompt, chatId);

    // Send the chat ID back via a custom header
    // This only happens ONCE per request, even if it's an existing chat.
    // The client should store this ID and send it back in subsequent requests.
    res.setHeader('X-Chat-Id', newOrExistingChatId); 
    
    // Stream chunks
    for await (const chunk of stream) {
      if (chunk.candidates && 
          chunk.candidates[0]?.content?.parts && 
          chunk.candidates[0].content.parts[0]?.text) {
        const text = chunk.candidates[0].content.parts[0].text;
        res.write(text); // Write text chunk
      }
    }
    
    res.end(); // End the stream when Gemini is done
  } catch (error) {
    console.error('Error processing chat stream:', error);
    if (!res.headersSent) {
      // Include chat ID in error if available
      res.status(500).json({ error: 'Failed to process the chat request', chatId: req.body.chatId });
      return;
    }
    // Ensure stream is ended even if headers were sent but error occurred during streaming
    if (!res.writableEnded) {
        res.end();
    }
  }
};

export const analyzeDocument = async (req: Request<{}, {}, AnalyzeRequestDto>, res: Response): Promise<void> => {
  try {
    const { prompt, filePath } = req.body;
    
    if (!prompt || !filePath) {
      res.status(400).json({ error: 'prompt and filePath are required' });
      return;
    }

    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }

    // Extract the JWT token (remove 'Bearer ' prefix)
    const jwt = authHeader.substring(7);

    // Log user ID for traceability
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const userId = req.user.id;
    console.log(`User ${userId} is analyzing document: ${filePath}`);
    
    // Get the file data from Supabase using the JWT token
    const file = await supabaseService.getFileData(filePath, jwt);
    
    // Create the response with the file included
    const response = await geminiService.generateContentWithFile(prompt, file.data, file.mimeType);
    
    // Handle the response normally (no streaming)
    if (response.candidates && 
        response.candidates[0]?.content?.parts && 
        response.candidates[0].content.parts[0]?.text) {
      const text = response.candidates[0].content.parts[0].text;
      
      // Parse the JSON response
      let annotations: Annotation[] = [];
      try {
        // Extract the JSON from text which might contain markdown or other wrappers
        const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
        annotations = JSON.parse(jsonString);
        
        // Validate the parsed annotations
        if (!Array.isArray(annotations)) {
          throw new Error('Annotations must be an array');
        }
        
        // Validate each annotation
        annotations = annotations.map(annotation => ({
          level: annotation.level as AnnotationLevel,
          description: annotation.description,
          metadata: annotation.metadata
        }));
      } catch (parseError) {
        console.error('Error parsing annotations:', parseError);
        res.status(400).json({ error: 'Failed to parse annotations from response' });
        return;
      }
      
      // Create a document record in the database
      const fileName = path.basename(filePath);
      const document = await supabaseService.createDocument(
        {
          userId,
          filePath,
          fileName
        },
        jwt
      );
      
      if (!document) {
        res.status(500).json({ error: 'Failed to create document record' });
        return;
      }
      
      // Store the annotations in the database
      const documentAnnotations = await supabaseService.createDocumentAnnotations(
        {
          documentId: document.id!,
          annotations
        }, 
        jwt
      );
      
      if (!documentAnnotations) {
        res.status(500).json({ error: 'Failed to store document annotations' });
        return;
      }
      
      // Return the complete response
      res.json({ 
        text,
        modelVersion: response.modelVersion,
        promptFeedback: response.promptFeedback,
        candidates: response.candidates,
        document,
        annotations: documentAnnotations.annotations
      });
    } else {
      res.status(404).json({ error: 'No valid response generated' });
    }
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'Failed to analyze the document' });
  }
}; 