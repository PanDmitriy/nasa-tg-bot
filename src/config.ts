import dotenv from 'dotenv';
dotenv.config();

export const config = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    commands: [
      { command: "start", description: "Запуск" },
      { command: "apod", description: "NASA. Астрономическое фото дня" },
      { command: "iss", description: "Показывает, где сейчас находится МКС" },
      { command: "earth", description: "Показывает последний снимок Земли из космоса" },
      { command: "asteroids", description: "Показывает информацию о ближайших астероидах" },
      { command: "mars", description: "Последние фото с марсоходов" },
      { command: "curiosity", description: "Фото с марсохода Curiosity" },
      { command: "perseverance", description: "Фото с марсохода Perseverance" }
    ]
  },
  nasa: {
    apiKey: process.env.NASA_API_KEY || '',
    urls: {
      apod: 'https://api.nasa.gov/planetary/apod',
      iss: 'https://api.wheretheiss.at/v1/satellites/25544',
      epic: 'https://api.nasa.gov/EPIC/api/natural',
      neo: 'https://api.nasa.gov/neo/rest/v1/feed',
      mars: 'https://api.nasa.gov/mars-photos/api/v1/rovers'
    }
  },
  timezone: 'Europe/Moscow',
  dateFormat: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }
} as const; 