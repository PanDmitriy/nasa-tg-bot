import { Config } from "../types";

export const developmentConfig: Config = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    commands: [
      { command: 'start', description: 'Начать работу с ботом' },
      { command: 'apod', description: 'Фото дня от NASA' },
      { command: 'iss', description: 'Местоположение МКС' },
      { command: 'earth', description: 'Снимок Земли' },
      { command: 'asteroids', description: 'Информация об астероидах' },
      { command: 'mars', description: 'Фотографии с Марса' }
    ]
  },
  nasa: {
    apiKey: process.env.NASA_API_KEY || '',
    baseUrl: 'https://api.nasa.gov'
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