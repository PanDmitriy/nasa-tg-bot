import OpenAI from 'openai';
import { createReadStream, promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log('Environment variables:', {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV
});
class OpenAIService {
    constructor(config) {
        this.roles = {
            SYSTEM: 'system',
            USER: 'user',
            ASSISTANT: 'assistant'
        };
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }
        console.log('Initializing OpenAI client with API key:', config.apiKey.substring(0, 10) + '...');
        this.client = new OpenAI({
            apiKey: config.apiKey
        });
        this.model = config.model || 'gpt-3.5-turbo';
    }
    async chat(messages) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                console.warn('⚠️ OPENAI_API_KEY не установлен. Используется заглушка.');
                return {
                    role: this.roles.ASSISTANT,
                    content: "🔒 API ключ не настроен. Ответ сгенерирован локально."
                };
            }
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
            });
            return response.choices[0].message;
        }
        catch (e) {
            console.error('🚫 Ошибка OpenAI:', e instanceof Error ? e.message : 'Unknown error');
            return {
                role: this.roles.ASSISTANT,
                content: "🤖 Сейчас я не могу обратиться к GPT, но скоро всё заработает!"
            };
        }
    }
    async transcription(filepath) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                console.warn('⚠️ OPENAI_API_KEY не установлен. Используется заглушка для транскрипции.');
                await fsPromises.unlink(filepath);
                return '🔒 Ключ API не настроен. Заглушка: здесь был бы текст с аудио.';
            }
            const file = createReadStream(filepath);
            const response = await this.client.audio.transcriptions.create({
                file,
                model: 'whisper-1',
                response_format: 'text'
            });
            await fsPromises.unlink(filepath);
            return response;
        }
        catch (e) {
            console.error('🚫 Ошибка при транскрибации аудио:', e instanceof Error ? e.message : 'Unknown error');
            await fsPromises.unlink(filepath);
            return '🤖 Временно не могу обработать аудио. Попробуйте позже!';
        }
    }
}
export const openai = new OpenAIService({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
});
//# sourceMappingURL=openai.js.map