import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer'; // Need this to transform plain object to class instance
import { OcrRequestDto } from '../dto/ocr.dto'; // Import the DTO

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
 * Middleware to validate the request body for the /mistral/ocr endpoint using filePath
 */
export const validateOcrRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Convert plain request body to class instance
  const ocrRequestDto = plainToInstance(OcrRequestDto, req.body);

  // Validate the DTO instance
  const errors = await validate(ocrRequestDto);

  if (errors.length > 0) {
    // Map errors to a simpler format if desired, or return the full errors array
    const errorMessages = errors.map(error => Object.values(error.constraints || {})).flat();
    res.status(400).json({ errors: errorMessages });
    return;
  }

  // Validation passed, proceed to the controller
  next();
};

/**
 * Middleware to validate the request body for the basic /chat endpoint
 */
export const validateChatRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required and must be a string' });
    return;
  }

  // Add more checks if needed (e.g., chatId)

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
