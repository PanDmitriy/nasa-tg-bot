import { OpenAI } from 'openai';
import { createReadStream, promises as fsPromises } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

  class OpenAIService {
  roles = {
    SYSTEM: "system",
    USER: "user",
    ASSISTANT: "assistant"
  }

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  
  }

  async chat(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages,
      });
      return response.choices[0].message;
    } catch (e) {
      console.error('Error while calling GPT chat API:', e.message);
      throw new Error('Failed to get a response from the OpenAI chat API');
    }
  };

  async transcription(filepath) {
    try {
      const response = await this.client.audio.transcriptions.create(
        createReadStream(filepath), 
        'whisper-1'
      );
      await fsPromises.unlink(filepath);
      return response.text;
    } catch (e) {
      console.error('Error while transcribing audio:', e.message);
      throw new Error('Failed to transcribe the audio file');
    }
  };
}

export const openai = new OpenAIService();
