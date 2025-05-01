import { Context } from 'telegraf';
import { BotContext } from '../types';
import { EarthApi } from '../../../features/earth/api';
import { config } from '../../../app/config';

const earthApi = new EarthApi(config.nasa.apiKey);

export async function handleEarth(ctx: Context & BotContext) {
  try {
    const image = await earthApi.getLatestEarthImage();
    
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 <b>Снимок Земли</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA Earth Polychromatic Imaging Camera (EPIC)</i>`,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Earth Error:', error);
    await ctx.reply('❌ Произошла ошибка при получении снимка Земли. Попробуйте позже.');
  }
} 