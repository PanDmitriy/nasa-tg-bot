import { Context } from 'telegraf';
import { BotContext } from '../types';
import { ApodApi } from '../../../features/apod/api';
import { config } from '../../../app/config';

const apodApi = new ApodApi(config.nasa.apiKey);

/**
 * Генерирует случайную дату между начальной датой APOD и конечной датой
 * @returns Дата в формате YYYY-MM-DD
 */
function getRandomApodDate(): string {
  // Первая доступная дата APOD - 16 июня 1995
  const startDate = new Date('1995-06-16');
  // Конечная дата - 1 октября 2025
  const endDate = new Date('2025-10-01');
  
  // Генерируем случайное количество дней между датами
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(startDate.getTime() + randomTime);
  
  // Форматируем дату в YYYY-MM-DD
  const year = randomDate.getFullYear();
  const month = String(randomDate.getMonth() + 1).padStart(2, '0');
  const day = String(randomDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export async function handleAPOD(ctx: Context & BotContext) {
  // Показываем индикатор загрузки и сообщение пользователю
  await ctx.sendChatAction('upload_photo');
  let loadingMessage: any = null;
  
  try {
    // Отправляем сообщение о загрузке
    loadingMessage = await ctx.reply('⏳ Загружаю случайное изображение дня...');
    
    // Генерируем случайную дату для запроса APOD
    const randomDate = getRandomApodDate();
    
    // Создаем таймаут для запроса (15 секунд, чуть больше чем таймаут axios)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout: Превышено время ожидания ответа от NASA API'));
      }, 15000);
    });
    
    // Объединяем запрос с таймаутом
    const apod = await Promise.race([
      apodApi.getApod(randomDate),
      timeoutPromise
    ]);
    
    if (!apod) {
      await ctx.reply('❌ К сожалению, не удалось получить изображение дня.');
      if (loadingMessage) {
        try { await ctx.deleteMessage(loadingMessage.message_id); } catch {}
      }
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
      
      // Удаляем сообщение о загрузке
      if (loadingMessage) {
        try { await ctx.deleteMessage(loadingMessage.message_id); } catch {}
      }
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
    
    // Удаляем сообщение о загрузке после успешной отправки
    if (loadingMessage) {
      try { await ctx.deleteMessage(loadingMessage.message_id); } catch {}
    }
  } catch (error) {
    console.error('APOD Error:', error);
    
    // Удаляем сообщение о загрузке при ошибке
    if (loadingMessage) {
      try { await ctx.deleteMessage(loadingMessage.message_id); } catch {}
    }
    
    // Улучшенная обработка ошибок
    const errorName = error?.constructor?.name || '';
    const msg = error instanceof Error ? error.message : String(error);
    
    // Обработка различных типов таймаутов
    if (
      errorName === 'TimeoutError' || 
      msg.includes('timeout') || 
      msg.includes('ETIMEDOUT') ||
      msg.includes('Request timeout') ||
      msg.includes('timed out')
    ) {
      await ctx.reply('⏱️ Превышено время ожидания ответа от NASA API. Пожалуйста, попробуйте позже.');
    } else if (msg.includes('NASA API Error: 429')) {
      await ctx.reply('⚠️ Превышен лимит запросов NASA (429). Подождите немного и повторите.');
    } else if (msg.includes('NASA API Error: 5')) {
      await ctx.reply('⚠️ Сервис NASA временно недоступен (5xx). Попробуйте позже.');
    } else {
      await ctx.reply('❌ Произошла ошибка при получении изображения дня. Попробуйте позже.');
    }
  }
}
