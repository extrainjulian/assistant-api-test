import { Request, Response } from 'express';
import geminiService from '../services/gemini.service';
import supabaseService from '../services/supabase.service';
import { AnalyzeRequestDto } from '../dto/analyze.dto';
import { Annotation, AnnotationLevel } from '../dto/document.dto';
import path from 'path';


export const analyzeDocument = async (req: Request<{}, {}, AnalyzeRequestDto>, res: Response): Promise<void> => {
  try {
    const { prompt, filePath } = req.body;

    if (!prompt || !filePath) {
      res.status(400).json({ error: 'prompt and filePath are required' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }

    const jwt = authHeader.substring(7);

    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userId = req.user.id;
    console.log(`User ${userId} is analyzing document: ${filePath}`);

    const file = await supabaseService.getFileData(filePath, jwt);

    const response = await geminiService.generateAnnotations(prompt, file.data, file.mimeType);

    if (response.candidates &&
      response.candidates[0]?.content?.parts &&
      response.candidates[0].content.parts[0]?.text) {
      const text = response.candidates[0].content.parts[0].text;

      let annotations: Annotation[] = [];
      try {
        const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
        annotations = JSON.parse(jsonString);

        if (!Array.isArray(annotations)) {
          throw new Error('Annotations must be an array');
        }

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

      res.json({
        modelVersion: response.modelVersion,
        promptFeedback: response.promptFeedback,
        documentId: document.id,
        document: document
      });
    } else {
      res.status(404).json({ error: 'No valid response generated' });
    }
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'Failed to analyze the document' });
  }
}; 