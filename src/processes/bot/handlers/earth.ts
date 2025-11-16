import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';
import { container } from '../../../shared/di/container';
import { getCallbackQueryData, getMessageId } from '../../../shared/lib/telegramHelpers';
import { logger } from '../../../shared/logger';

export async function handleEarth(ctx: Context & BotContext) {
  try {
    await ctx.sendChatAction('upload_photo');
    const loading = await ctx.reply('⏳ Загружаю снимок…');
    const image = await container.earthApi.getLatestEarthImageWithFallback('natural');
    
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 <b>Снимок Земли${image.isFallback ? ' — последняя доступная дата' : ''}</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA Earth Polychromatic Imaging Camera (EPIC)</i>`,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🌿 Natural', 'earth_type_natural'), Markup.button.callback('🎨 Enhanced', 'earth_type_enhanced')],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ])
    });
    try { await ctx.deleteMessage(loading.message_id); } catch {}
  } catch (error) {
    logger.error('Earth Error', error);
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes('NASA API Error: 503') || msg.includes('NASA API Error: 502') || msg.includes('NASA API Error: 504')) {
      const message = '❌ <b>Не удалось получить снимок Земли</b>\n\n' +
        'Сервер NASA EPIC временно недоступен. Это случается редко и обычно решается за несколько минут.\n\n' +
        '💡 <b>Что можно сделать:</b>\n' +
        '• Подождать 1-2 минуты и попробовать снова\n' +
        '• Попробовать другую команду (например, /apod)\n' +
        '• Вернуться позже';
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Повторить', 'earth_retry')],
        [Markup.button.callback('🌌 Фото дня', 'quick_apod')],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ]);
      
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
      return;
    }
    
    if (msg.includes('NASA API Error: 429')) {
      const message = '❌ <b>Слишком много запросов</b>\n\n' +
        'Вы превысили лимит запросов к API NASA. Это временное ограничение для защиты сервера.\n\n' +
        '💡 <b>Что можно сделать:</b>\n' +
        '• Подождать 1-2 минуты перед следующим запросом\n' +
        '• Попробовать другую команду\n' +
        '• Вернуться позже';
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌌 Фото дня', 'quick_apod')],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ]);
      
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
      return;
    }
    
    const message = '❌ <b>Не удалось получить снимок Земли</b>\n\n' +
      'Что-то пошло не так при загрузке снимка. Мы уже знаем об этом и работаем над исправлением.\n\n' +
      '💡 <b>Что можно сделать:</b>\n' +
      '• Попробовать повторить запрос через минуту\n' +
      '• Попробовать другую команду\n' +
      '• Вернуться позже';
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Повторить', 'earth_retry')],
      [Markup.button.callback('🌌 Фото дня', 'quick_apod')],
      [Markup.button.callback('🏠 Меню', 'main_menu')]
    ]);
    
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
} 

export async function handleEarthRetry(ctx: Context & BotContext) {
  try { await ctx.answerCbQuery(); } catch {}
  try { await ctx.deleteMessage(); } catch {}
  return handleEarth(ctx);
}

export async function handleEarthType(ctx: Context & BotContext) {
  const data = getCallbackQueryData(ctx);
  const type = data === 'earth_type_enhanced' ? 'enhanced' : 'natural';
  try { await ctx.answerCbQuery(); } catch {}
  try { await ctx.deleteMessage(); } catch {}
  await ctx.sendChatAction('upload_photo');
  const loading = await ctx.reply('⏳ Загружаю снимок…');
  try {
    const image = await container.earthApi.getLatestEarthImageWithFallback(type as 'natural' | 'enhanced');
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 <b>Снимок Земли (${type === 'natural' ? 'Natural' : 'Enhanced'})${image.isFallback ? ' — последняя доступная дата' : ''}</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA EPIC</i>`,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🌿 Natural', 'earth_type_natural'), Markup.button.callback('🎨 Enhanced', 'earth_type_enhanced')],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ])
    });
  } catch (error) {
    logger.error('Earth Type Error', error);
    await ctx.reply('❌ Не удалось получить снимок. Попробуйте позже.', Markup.inlineKeyboard([
      Markup.button.callback('🔄 Повторить', 'earth_retry')
    ]));
  } finally {
    const messageId = getMessageId(loading);
    if (messageId) {
      try { await ctx.deleteMessage(messageId); } catch {}
    }
  }
}