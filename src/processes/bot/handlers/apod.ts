import { Context } from 'telegraf';
import { BotContext } from '../types';
import { container } from '../../../shared/di/container';
import { config } from '../../../app/config';
import { getMessageId } from '../../../shared/lib/telegramHelpers';
import { logger } from '../../../shared/logger';

export async function handleAPOD(ctx: Context & BotContext) {
  // Показываем индикатор загрузки и сообщение пользователю
  await ctx.sendChatAction('upload_photo');
  let loadingMessage: { message_id: number } | null = null;
  
  try {
    // Отправляем сообщение о загрузке
    loadingMessage = await ctx.reply('⏳ Загружаю случайное изображение дня...');
    
    // Создаем таймаут для запроса (используем половину таймаута из конфига для дополнительной безопасности)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout: Превышено время ожидания ответа от NASA API'));
      }, config.api.timeout / 2);
    });
    
    // Получаем случайное APOD через сервис из DI контейнера
    const apod = await Promise.race([
      container.apodService.getRandomApod(),
      timeoutPromise
    ]);
    
    if (!apod) {
      await ctx.reply('❌ К сожалению, не удалось получить изображение дня.');
      const messageId = getMessageId(loadingMessage);
      if (messageId) {
        try { await ctx.deleteMessage(messageId); } catch {}
      }
      return;
    }

    if (apod.media_type !== 'image') {
      const message = container.apodService.formatApodAsText(apod);
      await ctx.reply(message, { 
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });
      
      // Удаляем сообщение о загрузке
      const messageId = getMessageId(loadingMessage);
      if (messageId) {
        try { await ctx.deleteMessage(messageId); } catch {}
      }
      return;
    }

    const caption = container.apodService.formatApodAsImage(apod);
    await ctx.replyWithPhoto(apod.url, {
      caption,
      parse_mode: 'HTML'
    });
    
    // Удаляем сообщение о загрузке после успешной отправки
    const messageId = getMessageId(loadingMessage);
    if (messageId) {
      try { await ctx.deleteMessage(messageId); } catch {}
    }
  } catch (error) {
    logger.error('APOD Error', error);
    
    // Удаляем сообщение о загрузке при ошибке
    const messageId = getMessageId(loadingMessage);
    if (messageId) {
      try { await ctx.deleteMessage(messageId); } catch {}
    }
    
    // Ошибки обрабатываются глобальным middleware
    throw error;
  }
}
