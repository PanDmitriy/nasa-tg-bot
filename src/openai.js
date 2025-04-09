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

  client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  

  async chat(messages) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY не установлен. Используется заглушка.');
        return {
          role: this.roles.ASSISTANT,
          content: "🔒 API ключ не настроен. Ответ сгенерирован локально."
        };
      }
  
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
      });
  
      return response.choices[0].message;
    } catch (e) {
      console.error('🚫 Ошибка OpenAI:', e.message);
  
      // Простая заглушка-ответ на ошибку
      return {
        role: this.roles.ASSISTANT,
        content: "🤖 Сейчас я не могу обратиться к GPT, но скоро всё заработает!"
      };
    }
  };

  async transcription(filepath) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️ OPENAI_API_KEY не установлен. Используется заглушка для транскрипции.');
        await fsPromises.unlink(filepath);
        return '🔒 Ключ API не настроен. Заглушка: здесь был бы текст с аудио.';
      }
  
      const response = await this.openai.audio.transcriptions.create(
        createReadStream(filepath),
        'whisper-1'
      );
  
      await fsPromises.unlink(filepath);
      return response.text;
  
    } catch (e) {
      console.error('🚫 Ошибка при транскрибации аудио:', e.message);
      await fsPromises.unlink(filepath);
  
      // Заглушка на случай ошибки
      return '🤖 Временно не могу обработать аудио. Попробуйте позже!';
    }
  }
}

export const openai = new OpenAIService();
