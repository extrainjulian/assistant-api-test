import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate document analysis requests
 */
export const validateAnalyzeRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { prompt, filePath } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required and must be a string' });
    return;
  }

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'FilePath is required and must be a string' });
    return;
  }
  
  // Valid request, proceed
  next();
};

/**
 * Middleware to validate assistant chat requests
 */
export const validateAssistantRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { userMessage, chatSessionId, filePaths } = req.body;
  
  if (!userMessage || typeof userMessage !== 'string') {
    res.status(400).json({ error: 'userMessage is required and must be a string' });
    return;
  }
  
  if (chatSessionId !== undefined && typeof chatSessionId !== 'string') {
    res.status(400).json({ error: 'chatSessionId must be a string if provided' });
    return;
  }
  
  if (filePaths !== undefined) {
    if (!Array.isArray(filePaths)) {
      res.status(400).json({ error: 'filePaths must be an array if provided' });
      return;
    }
    
    // Check that all file paths are strings
    for (const filePath of filePaths) {
      if (typeof filePath !== 'string') {
        res.status(400).json({ error: 'All filePaths must be strings' });
        return;
      }
    }
  }
  
  // Valid request, proceed
  next();
}; 