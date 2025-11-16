import { logger } from './index';

/**
 * Настройка глобальных обработчиков ошибок
 * Простое логирование без внешних сервисов
 */
export function initSentry(): void {
  // Функция оставлена для обратной совместимости, но ничего не делает
  // Можно использовать для будущей инициализации других сервисов мониторинга
}

/**
 * Глобальные обработчики необработанных исключений
 */
export function setupGlobalErrorHandlers(): void {
  // Обработка необработанных исключений
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    // Даем время для логирования перед завершением
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });

  // Обработка необработанных отклонений промисов
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Rejection', error, {
      promise: String(promise),
    });
  });
}

