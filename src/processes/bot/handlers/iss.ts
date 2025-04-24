import { Context } from 'telegraf';
import { BotContext } from '../types';
import { IssApi } from '../../../features/iss/api';
import { config } from '../../../app/config';
import { createPhotoNavigationKeyboard } from '../../../shared/ui/keyboard';

const issApi = new IssApi(config.nasa.apiKey);

export async function handleISS(ctx: Context & BotContext) {
  try {
    const data = await issApi.getIssPosition();
    
    const latitude = parseFloat(data.iss_position.latitude as any);
    const longitude = parseFloat(data.iss_position.longitude as any);

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