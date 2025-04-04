import { GoogleGenAI } from '@google/genai';
import config from '../config/env';

class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-2.5-pro-exp-03-25';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async generateContentStream(prompt: string) {
    try {
      const response = await this.ai.models.generateContentStream({
        model: this.modelName,
        contents: prompt,
      });
      
      return response;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }
}

export default new GeminiService(); 