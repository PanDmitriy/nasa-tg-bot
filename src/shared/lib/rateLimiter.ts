import { BotContext } from '../../processes/bot/types';

/**
 * Хранилище запросов пользователей для rate limiting
 * Ключ: userId, значение: { commands: timestamp[], callbacks: timestamp[] }
 */
interface UserRequests {
  commands: number[];
  callbacks: number[];
}

const userRequests = new Map<number, UserRequests>();

/**
 * Конфигурация rate limiting
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута

// Разные лимиты для разных типов действий
const MAX_COMMANDS_PER_WINDOW = 20; // Команды (команды бота)
const MAX_CALLBACKS_PER_WINDOW = 60; // Callback queries (кнопки, навигация в галереях)

/**
 * Определяет тип запроса
 */
function getRequestType(ctx: BotContext): 'command' | 'callback' | 'other' {
  if (ctx.message && 'text' in ctx.message && ctx.message.text?.startsWith('/')) {
    return 'command';
  }
  if (ctx.callbackQuery) {
    return 'callback';
  }
  return 'other';
}

/**
 * Middleware для rate limiting
 * Ограничивает количество запросов от одного пользователя
 * Использует разные лимиты для команд и callback queries (кнопки)
 */
export function rateLimitMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;

    // Если пользователь не определен, пропускаем
    if (!userId) {
      return next();
    }

    const requestType = getRequestType(ctx);
    
    // Для других типов запросов (например, текстовые сообщения без команд) не ограничиваем
    if (requestType === 'other') {
      return next();
    }

    const now = Date.now();
    let userRequestsData = userRequests.get(userId);
    
    if (!userRequestsData) {
      userRequestsData = { commands: [], callbacks: [] };
      userRequests.set(userId, userRequestsData);
    }

    // Удаляем старые запросы (старше окна времени)
    const recentCommands = userRequestsData.commands.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    const recentCallbacks = userRequestsData.callbacks.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Определяем лимит и текущий счетчик в зависимости от типа запроса
    let maxRequests: number;
    let currentCount: number;
    
    if (requestType === 'command') {
      maxRequests = MAX_COMMANDS_PER_WINDOW;
      currentCount = recentCommands.length;
    } else {
      maxRequests = MAX_CALLBACKS_PER_WINDOW;
      currentCount = recentCallbacks.length;
    }

    // Проверяем лимит
    if (currentCount >= maxRequests) {
      const limitType = requestType === 'command' ? 'команд' : 'действий';
      await ctx.reply(
        `⚠️ Слишком много запросов. Подождите немного перед следующим действием.\n\n` +
        `Лимит: ${maxRequests} ${limitType} в минуту.`
      );
      
      // Для callback queries отвечаем на query, чтобы убрать индикатор загрузки
      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery('Слишком много запросов. Подождите немного.');
        } catch {
          // Игнорируем ошибки при ответе на callback query
        }
      }
      return;
    }

    // Добавляем текущий запрос в соответствующий массив
    if (requestType === 'command') {
      recentCommands.push(now);
      userRequestsData.commands = recentCommands;
    } else {
      recentCallbacks.push(now);
      userRequestsData.callbacks = recentCallbacks;
    }
    
    userRequests.set(userId, userRequestsData);

    // Периодическая очистка старых записей (каждые 5 минут)
    if (Math.random() < 0.01) {
      // ~1% вероятность при каждом запросе
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
    const recentCommands = requests.commands.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    const recentCallbacks = requests.callbacks.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (recentCommands.length === 0 && recentCallbacks.length === 0) {
      userRequests.delete(userId);
    } else {
      userRequests.set(userId, {
        commands: recentCommands,
        callbacks: recentCallbacks,
      });
    }
  }
}


