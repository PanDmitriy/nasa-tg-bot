import { BotCommand } from 'telegraf/types';

export interface Config {
  bot: {
    token: string;
    commands: BotCommand[];
  };
  nasa: {
    apiKey: string;
    baseUrl: string;
  };
  apod: {
    startDate: string; // Первая доступная дата APOD
    endDate: string; // Конечная дата (обычно текущая дата)
  };
  donki: {
    checkIntervalMs: number; // Интервал проверки новых событий в миллисекундах
  };
  api: {
    timeout: number; // Таймаут запросов в миллисекундах
    maxRetries: number; // Максимальное количество попыток повтора
  };
  timezone: string;
  dateFormat: {
    day: 'numeric' | '2-digit';
    month: 'long' | 'short' | 'numeric' | '2-digit';
    year: 'numeric' | '2-digit';
    hour: '2-digit';
    minute: '2-digit';
    second: '2-digit';
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'dev' | 'json';
  };
} 