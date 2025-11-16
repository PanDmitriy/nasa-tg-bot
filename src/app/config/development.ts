import { Config } from "../types";
import { validateEnv } from "./validation";

const env = validateEnv();

export const developmentConfig: Config = {
  bot: {
    token: env.TELEGRAM_BOT_TOKEN,
    commands: [
      { command: 'start', description: 'Начать работу с ботом' },
      { command: 'apod', description: 'Фото дня от NASA' },
      { command: 'earth', description: 'Снимок Земли' },
      { command: 'asteroids', description: 'Информация об астероидах' },
      { command: 'images', description: 'Галерея изображений NASA' },
      { command: 'donki', description: 'Космическая погода (DONKI)' },
      { command: 'subscribe', description: 'Подписка на Daily APOD' },
      { command: 'unsubscribe', description: 'Отключить подписки' },
      { command: 'premium', description: 'Premium подписка' },
      { command: 'help', description: 'Помощь' },
    ]
  },
  nasa: {
    apiKey: env.NASA_API_KEY,
    baseUrl: 'https://api.nasa.gov'
  },
  apod: {
    startDate: '1995-06-16', // Первая доступная дата APOD
    endDate: new Date().toISOString().split('T')[0], // Текущая дата
  },
  donki: {
    checkIntervalMs: 15 * 60 * 1000, // 15 минут
  },
  api: {
    timeout: 30000, // 30 секунд
    maxRetries: 3,
  },
  timezone: 'Europe/Moscow',
  dateFormat: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  },
  logging: {
    level: 'debug',
    format: 'json'
  }
}; 