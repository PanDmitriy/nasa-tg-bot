import { Context } from 'telegraf';
import { BotContext } from '../../../processes/bot/types';

/**
 * Кастомный класс ошибки для бота NASA
 */
export class NasaBotError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NasaBotError';
  }
}

/**
 * Создает кастомную ошибку
 */
export function createError(message: string, code: string): NasaBotError {
  return new NasaBotError(message, code);
}

/**
 * Обрабатывает ошибку и возвращает сообщение для пользователя
 */
export function handleError(error: unknown): string {
  if (error instanceof NasaBotError) {
    return `🚫 ${error.message}`;
  }

  if (error instanceof Error) {
    console.error('Error:', error.message);
    return '🚫 Произошла ошибка. Попробуйте позже.';
  }

  console.error('Unknown error:', error);
  return '🚫 Произошла неизвестная ошибка. Попробуйте позже.';
}

/**
 * Обрабатывает ошибку в контексте Telegram и отправляет сообщение пользователю
 */
export async function handleTelegramError(
  ctx: Context & BotContext,
  error: unknown,
  context: string = 'Handler'
): Promise<void> {
  console.error(`${context} Error:`, error);

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Определяем тип ошибки и отправляем соответствующее сообщение
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('Request timeout') ||
    errorMessage.includes('timed out')
  ) {
    await ctx.reply('⏱️ Превышено время ожидания ответа от NASA API. Пожалуйста, попробуйте позже.');
  } else if (errorMessage.includes('NASA API Error: 429')) {
    await ctx.reply('⚠️ Превышен лимит запросов NASA (429). Подождите немного и повторите.');
  } else if (errorMessage.includes('NASA API Error: 5')) {
    await ctx.reply('⚠️ Сервис NASA временно недоступен (5xx). Попробуйте позже.');
  } else if (errorMessage.includes('NASA API Error: 503') || 
             errorMessage.includes('NASA API Error: 502') || 
             errorMessage.includes('NASA API Error: 504')) {
    await ctx.reply('⚠️ Сервис NASA временно недоступен (5xx). Попробуйте позже.');
  } else {
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}
