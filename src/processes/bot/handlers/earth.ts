import { Context } from 'telegraf';
import { BotContext } from '../types';
import { EarthApi } from '../../../features/earth/api';

const earthApi = new EarthApi();

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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('NASA API Error: 503') || msg.includes('NASA API Error: 502') || msg.includes('NASA API Error: 504')) {
      await ctx.reply('⚠️ Сервис NASA EPIC временно недоступен (5xx). Попробуйте позже.');
      return;
    }
    if (msg.includes('NASA API Error: 429')) {
      await ctx.reply('⚠️ Превышен лимит запросов NASA (429). Подождите немного и повторите.');
      return;
    }
    await ctx.reply('❌ Произошла ошибка при получении снимка Земли. Попробуйте позже.');
  }
} 