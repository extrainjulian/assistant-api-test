import { Request, Response } from 'express';
import geminiService from '../services/gemini.service';
import { ChatRequestDto } from '../dto/chat.dto';

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