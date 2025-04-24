export class ErrorHandler {
  static handleError(error: unknown): string {
    if (error instanceof Error) {
      return `Произошла ошибка: ${error.message}`;
    }
    return 'Произошла неизвестная ошибка';
  }

  static createError(message: string, code: string): Error {
    const error = new Error(message);
    error.name = code;
    return error;
  }
} 