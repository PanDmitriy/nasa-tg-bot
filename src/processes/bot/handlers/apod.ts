import { Context } from 'telegraf';
import { BotContext } from '../types';
import { ApodApi } from '../../../features/apod/api';
import { config } from '../../../app/config';

const apodApi = new ApodApi(config.nasa.apiKey);

export async function handleAPOD(ctx: Context & BotContext) {
  try {
    const apod = await apodApi.getApod();
    
    if (!apod) {
      await ctx.reply('К сожалению, не удалось получить изображение дня.');
      return;
    }

    if (apod.media_type !== 'image') {
      await ctx.reply(`🌌 ${apod.title}\n\n` +
        `📅 ${new Date(apod.date).toLocaleString('ru-RU')}\n\n` +
        `${apod.explanation}\n\n` +
        `🔗 ${apod.url}`);
      return;
    }

    const caption = `🌌 ${apod.title}\n\n` +
      `📅 ${new Date(apod.date).toLocaleString('ru-RU')}\n\n` +
      `${apod.explanation.substring(0, 500)}...`;

    await ctx.replyWithPhoto(apod.url, {
      caption,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('APOD Error:', error);
    await ctx.reply('Произошла ошибка при получении изображения дня. Попробуйте позже.');
  }
} 