import * as Sentry from '@sentry/node';

/**
 * Инициализация Sentry для мониторинга ошибок
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry is disabled (SENTRY_DSN not set)');
    return;
  }

  const environment = process.env.NODE_ENV || 'development';
  const tracesSampleRate = environment === 'production' ? 0.1 : 1.0;

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    // HTTP интеграция включена по умолчанию в @sentry/node
  });

  console.log('Sentry initialized successfully');
}

/**
 * Обертка для глобального обработчика необработанных исключений
 */
export function setupGlobalErrorHandlers(): void {
  // Обработка необработанных исключений
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    Sentry.captureException(error);
    // Даем время Sentry отправить событие перед завершением
    Sentry.flush(2000).then(() => {
      process.exit(1);
    });
  });

  // Обработка необработанных отклонений промисов
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    const error = reason instanceof Error ? reason : new Error(String(reason));
    Sentry.captureException(error, {
      contexts: {
        promise: {
          promise: String(promise),
        },
      },
    });
  });
}

