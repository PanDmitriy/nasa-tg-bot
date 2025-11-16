import { Context, Markup } from 'telegraf';
import { BotContext } from '../../../processes/bot/types';
import { logger } from '../../logger';

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
    logger.error('Error', error);
    return '🚫 Произошла ошибка. Попробуйте позже.';
  }

  logger.error('Unknown error', error);
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
  logger.error(`${context} Error`, error, {
    chatId: ctx.chat?.id,
    updateType: ctx.updateType,
  });

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Определяем тип ошибки и отправляем соответствующее сообщение
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('Request timeout') ||
    errorMessage.includes('timed out')
  ) {
    const message = '❌ <b>Не удалось получить данные</b>\n\n' +
      'Запрос к серверу NASA занял слишком много времени. Это может произойти при высокой нагрузке на сервер.\n\n' +
      '💡 <b>Что можно сделать:</b>\n' +
      '• Подождать 1-2 минуты и попробовать снова\n' +
      '• Попробовать другую команду (например, /images)\n' +
      '• Вернуться позже';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Повторить', 'retry_action')],
      [Markup.button.callback('🖼️ Галерея', 'images_menu')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);

    try {
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch {
      // Если не удалось отправить с клавиатурой, отправляем без неё
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } else if (errorMessage.includes('NASA API Error: 429')) {
    const message = '❌ <b>Слишком много запросов</b>\n\n' +
      'Вы превысили лимит запросов к API NASA. Это временное ограничение для защиты сервера.\n\n' +
      '💡 <b>Что можно сделать:</b>\n' +
      '• Подождать 1-2 минуты перед следующим запросом\n' +
      '• Попробовать другую команду\n' +
      '• Вернуться позже';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🖼️ Галерея', 'images_menu')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);

    try {
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } else if (
    errorMessage.includes('NASA API Error: 5') ||
    errorMessage.includes('NASA API Error: 503') || 
    errorMessage.includes('NASA API Error: 502') || 
    errorMessage.includes('NASA API Error: 504')
  ) {
    const message = '❌ <b>Не удалось получить данные</b>\n\n' +
      'Похоже, сервер NASA временно недоступен. Это случается редко и обычно решается за несколько минут.\n\n' +
      '💡 <b>Что можно сделать:</b>\n' +
      '• Подождать 1-2 минуты и попробовать снова\n' +
      '• Попробовать другую команду (например, /images)\n' +
      '• Вернуться позже';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Повторить', 'retry_action')],
      [Markup.button.callback('🖼️ Галерея', 'images_menu')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);

    try {
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } else {
    const message = '❌ <b>Произошла ошибка</b>\n\n' +
      'Что-то пошло не так при обработке вашего запроса. Мы уже знаем об этом и работаем над исправлением.\n\n' +
      '💡 <b>Что можно сделать:</b>\n' +
      '• Попробовать повторить запрос через минуту\n' +
      '• Попробовать другую команду\n' +
      '• Вернуться позже';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🖼️ Галерея', 'images_menu')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);

    try {
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  }
}
