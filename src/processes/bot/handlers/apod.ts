import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';
import { container } from '../../../shared/di/container';
import { config } from '../../../app/config';
import { getMessageId, getCallbackQueryData } from '../../../shared/lib/telegramHelpers';
import { logger } from '../../../shared/logger';
import { handleTelegramError } from '../../../shared/lib/errorHandler/errorHandler';

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
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📖 Читать полностью', `apod_full_${apod.date}`),
        Markup.button.url('🔗 На сайте NASA', `https://apod.nasa.gov/apod/ap${apod.date.replace(/-/g, '')}.html`)
      ],
      [
        Markup.button.callback('🌌 Еще фото', 'apod_random'),
        Markup.button.callback('🏠 Меню', 'main_menu')
      ]
    ]);
    
    await ctx.replyWithPhoto(apod.url, {
      caption,
      parse_mode: 'HTML',
      ...keyboard
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

/**
 * Обработчик для "Читать полностью"
 */
export async function handleApodFull(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery('📖 Загружаю полное описание...');
    
    const data = getCallbackQueryData(ctx);
    const date = data.replace('apod_full_', '');
    
    const apod = await container.apodService.getApod(date);
    
    const fullMessage = `🌌 <b>${apod.title}</b>\n\n` +
      `📅 <i>${new Date(apod.date).toLocaleString('ru-RU')}</i>\n\n` +
      `${apod.explanation}\n\n` +
      `📸 <i>NASA Astronomy Picture of the Day</i>\n\n` +
      `🔗 <a href="https://apod.nasa.gov/apod/ap${apod.date.replace(/-/g, '')}.html">Открыть на сайте NASA</a>`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🌌 Еще фото', 'apod_random')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);
    
    try {
      await ctx.editMessageText(fullMessage, {
        parse_mode: 'HTML',
        ...keyboard,
        link_preview_options: { is_disabled: true }
      });
    } catch {
      await ctx.reply(fullMessage, {
        parse_mode: 'HTML',
        ...keyboard,
        link_preview_options: { is_disabled: true }
      });
    }
  } catch (error) {
    await handleTelegramError(ctx, error, 'ApodFull');
  }
}

/**
 * Обработчик для "Еще фото" (случайное фото)
 */
export async function handleApodRandom(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery('🌌 Загружаю новое фото...');
    try {
      await ctx.deleteMessage();
    } catch {}
    await handleAPOD(ctx);
  } catch (error) {
    await handleTelegramError(ctx, error, 'ApodRandom');
  }
}
