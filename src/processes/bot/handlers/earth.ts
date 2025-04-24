import { Context } from 'telegraf';
import { BotContext } from '../types';
import { EarthApi } from '../../../features/earth/api';
import { config } from '../../../app/config';

const earthApi = new EarthApi(config.nasa.apiKey);

export async function handleEarth(ctx: Context & BotContext) {
  try {
    const image = await earthApi.getLatestEarthImage();
    
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 Снимок Земли от ${new Date(image.date).toLocaleString('ru-RU')}\n\n${image.caption}`,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Earth Error:', error);
    await ctx.reply('Произошла ошибка при получении снимка Земли. Попробуйте позже.');
  }
} 