import express, { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import authenticateToken from '../middleware/auth.middleware';
import supabaseService from '../services/supabase.service';

const router = express.Router();

interface DocumentIdParams extends ParamsDictionary {
  documentId: string;
}

/**
 * @route GET /api/documents
 * @description Get all documents for the authenticated user
 * @access Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }
    
    const jwt = authHeader.substring(7);
    const userId = req.user.id;
    
    const documents = await supabaseService.getDocumentsByUserId(userId, jwt);
    
    res.json({ documents });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

/**
 * @route GET /api/documents/:documentId/annotations
 * @description Get annotations for a specific document
 * @access Private
 */
router.get('/:documentId/annotations', authenticateToken, async (req: Request<DocumentIdParams>, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const { documentId } = req.params;
    
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }
    
    const jwt = authHeader.substring(7);
    
    const annotations = await supabaseService.getDocumentAnnotations(documentId, jwt);
    
    if (!annotations) {
      res.status(404).json({ error: 'Annotations not found for this document' });
      return;
    }
    
    res.json({ annotations });
  } catch (error) {
    console.error('Error getting document annotations:', error);
    res.status(500).json({ error: 'Failed to get document annotations' });
  }
});

export default router; 