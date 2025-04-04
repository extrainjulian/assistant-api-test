import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate chat requests
 */
export const validateChatRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required and must be a string' });
    return;
  }
  
  // Valid request, proceed
  next();
}; 