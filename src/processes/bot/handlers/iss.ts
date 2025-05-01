import { Context } from 'telegraf';
import { BotContext } from '../types';
import { IssApi } from '../../../features/iss/api';
import { config } from '../../../app/config';

interface IssPosition {
  latitude: number;
  longitude: number;
}

interface IssData {
  iss_position: IssPosition;
  timestamp: number;
}

const issApi = new IssApi(config.nasa.apiKey);

export async function handleISS(ctx: Context & BotContext) {
  try {
    const data = await issApi.getIssPosition() as IssData;
    
    const latitude = data.iss_position.latitude;
    const longitude = data.iss_position.longitude;

    const message = `🛰️ МКС сейчас находится над координатами:\n` +
      `Широта: ${latitude.toFixed(2)}°\n` +
      `Долгота: ${longitude.toFixed(2)}°\n\n` +
      `Последнее обновление: ${new Date(data.timestamp * 1000).toLocaleString('ru-RU')}`;

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🗺️ Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` },
            { text: '📍 Яндекс.Карты', url: `https://yandex.ru/maps/?text=${latitude},${longitude}` }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('ISS Error:', error);
    await ctx.reply('Произошла ошибка при получении данных о местоположении МКС. Попробуйте позже.');
  }
} 