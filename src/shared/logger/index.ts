import * as Sentry from '@sentry/node';

type LogContext = Record<string, unknown>;

function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const potentialError = error as { message?: unknown };
    return new Error(String(potentialError.message ?? 'Unknown error'));
  }

  return new Error(String(error));
}

export const logger = {
  error(message: string, error?: unknown, context?: LogContext): void {
    if (error) {
      const normalizedError = ensureError(error);
      console.error(`[ERROR] ${message}`, normalizedError, context);
      Sentry.captureException(normalizedError, {
        extra: context,
        tags: { logger: 'error' },
      });
      return;
    }

    console.error(`[ERROR] ${message}`, context);
    Sentry.captureMessage(message, {
      level: 'error',
      extra: context,
      tags: { logger: 'error' },
    });
  },

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context);
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: context,
      tags: { logger: 'warn' },
    });
  },

  info(message: string, context?: LogContext): void {
    console.log(`[INFO] ${message}`, context);
  },

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};

