import { Context } from 'telegraf';

/**
 * Базовый интерфейс для Telegram контекста
 * Используется в features для избежания зависимостей от processes
 */
export interface BaseTelegramContext {
  from?: { id: number; username?: string; first_name?: string };
  chat?: { id: number; type?: string };
  reply: (text: string, options?: any) => Promise<any>;
  answerCbQuery: (text?: string, options?: any) => Promise<boolean>;
  editMessageText: (text: string, options?: any) => Promise<any>;
  deleteMessage: (messageId?: number) => Promise<boolean>;
  sendChatAction: (action: string) => Promise<boolean>;
  message?: any;
}

/**
 * Расширенный контекст с сессией (используется в processes)
 */
export interface TelegramContextWithSession extends Context {
  session?: any;
}

