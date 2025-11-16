import { Context } from 'telegraf';
import { BotContext } from '../../processes/bot/types';

/**
 * Безопасно получает данные из callback query
 */
export function getCallbackQueryData(ctx: BotContext): string | null {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
    return ctx.callbackQuery.data;
  }
  return null;
}

/**
 * Тип для сообщения с message_id
 */
export interface MessageWithId {
  message_id: number;
}

/**
 * Проверяет, является ли объект сообщением с message_id
 */
export function isMessageWithId(message: unknown): message is MessageWithId {
  return (
    typeof message === 'object' &&
    message !== null &&
    'message_id' in message &&
    typeof (message as { message_id: unknown }).message_id === 'number'
  );
}

/**
 * Безопасно получает message_id из сообщения
 */
export function getMessageId(message: unknown): number | null {
  if (isMessageWithId(message)) {
    return message.message_id;
  }
  if (message && typeof message === 'object' && 'message_id' in message) {
    const id = (message as { message_id: unknown }).message_id;
    if (typeof id === 'number') {
      return id;
    }
  }
  return null;
}

/**
 * Получает имя пользователя для персонализации сообщений
 */
export function getUserName(ctx: Context & BotContext): string {
  if (ctx.from?.first_name) {
    return ctx.from.first_name;
  }
  if (ctx.from?.username) {
    return ctx.from.username;
  }
  return 'друг';
}
