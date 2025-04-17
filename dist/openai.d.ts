import { Message } from './types/index.js';
interface OpenAIConfig {
    apiKey: string;
    model: string;
}
interface ChatResponse {
    content: string;
    role: string;
}
declare class OpenAIService {
    private client;
    private model;
    roles: {
        SYSTEM: string;
        USER: string;
        ASSISTANT: string;
    };
    constructor(config: OpenAIConfig);
    chat(messages: Message[]): Promise<ChatResponse>;
    transcription(filepath: string): Promise<string>;
}
export declare const openai: OpenAIService;
export {};
