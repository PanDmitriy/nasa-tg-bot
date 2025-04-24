export class NasaBotError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NasaBotError';
  }
}

export const errorHandler = {
  handleError(error: unknown): string {
    if (error instanceof NasaBotError) {
      return `🚫 ${error.message}`;
    }

    if (error instanceof Error) {
      console.error('Error:', error.message);
      return '🚫 Произошла ошибка. Попробуйте позже.';
    }

    console.error('Unknown error:', error);
    return '🚫 Произошла неизвестная ошибка. Попробуйте позже.';
  },

  createError(message: string, code: string): NasaBotError {
    return new NasaBotError(message, code);
  }
}; 