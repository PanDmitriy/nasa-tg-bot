import { BotContext } from '../../processes/bot/types';

/**
 * Хранилище запросов пользователей для rate limiting
 */
const userRequests = new Map<number, number[]>();

/**
 * Конфигурация rate limiting
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Middleware для rate limiting
 * Ограничивает количество запросов от одного пользователя
 */
export function rateLimitMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    
    // Если пользователь не определен, пропускаем
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userRequestsList = userRequests.get(userId) || [];

    // Удаляем старые запросы (старше окна времени)
    const recentRequests = userRequestsList.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Проверяем лимит
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      await ctx.reply(
        `⚠️ Слишком много запросов. Подождите немного перед следующим запросом.\n\n` +
        `Лимит: ${MAX_REQUESTS_PER_WINDOW} запросов в минуту.`
      );
      return;
    }

    // Добавляем текущий запрос
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    // Периодическая очистка старых записей (каждые 5 минут)
    if (Math.random() < 0.01) { // ~1% вероятность при каждом запросе
      cleanupOldRequests();
    }

    return next();
  };
}

/**
 * Очищает старые записи о запросах для экономии памяти
 */
function cleanupOldRequests(): void {
  const now = Date.now();
  for (const [userId, requests] of userRequests.entries()) {
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (recentRequests.length === 0) {
      userRequests.delete(userId);
    } else {
      userRequests.set(userId, recentRequests);
    }
  }
}

