import { Context } from 'telegraf';
import { BotContext } from '../types';
import { ApodApi } from '../../../features/apod/api';
import { config } from '../../../app/config';

const apodApi = new ApodApi(config.nasa.apiKey);

export async function handleAPOD(ctx: Context & BotContext) {
  try {
    const apod = await apodApi.getApod();
    
    if (!apod) {
      await ctx.reply('❌ К сожалению, не удалось получить изображение дня.');
      return;
    }

    if (apod.media_type !== 'image') {
      const message = `🌌 <b>${apod.title}</b>\n\n` +
        `📅 <i>${new Date(apod.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${apod.explanation}\n\n` +
        `🔗 <a href="${apod.url}">Ссылка на медиа</a>`;

      await ctx.reply(message, { 
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });
      return;
    }

    const caption = `🌌 <b>${apod.title}</b>\n\n` +
      `📅 <i>${new Date(apod.date).toLocaleString('ru-RU')}</i>\n\n` +
      `${apod.explanation.substring(0, 500)}...\n\n` +
      `📸 <i>NASA Astronomy Picture of the Day</i>`;

    await ctx.replyWithPhoto(apod.url, {
      caption,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('APOD Error:', error);
    await ctx.reply('❌ Произошла ошибка при получении изображения дня. Попробуйте позже.');
  }
}
