import { Request, Response } from 'express';
import geminiService from '../services/gemini.service';
import { ChatRequestDto } from '../dto/chat.dto';

export const streamChat = async (req: Request<{}, {}, ChatRequestDto>, res: Response): Promise<void> => {
  try {
    const { prompt = "Why is the sky blue?" } = req.body;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    const response = await geminiService.generateContentStream(prompt);
    
    // Stream chunks directly to the client
    for await (const chunk of response) {
      // Extract just the text content from the chunk
      if (chunk.candidates && 
          chunk.candidates[0]?.content?.parts && 
          chunk.candidates[0].content.parts[0]?.text) {
        const text = chunk.candidates[0].content.parts[0].text;
        res.write(text);
      }
    }
    
    res.end();
  } catch (error) {
    console.error('Error processing stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process the request' });
      return;
    }
    res.end();
  }
}; 