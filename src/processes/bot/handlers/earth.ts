import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';
import { EarthApi } from '../../../features/earth/api';

const earthApi = new EarthApi();

export async function handleEarth(ctx: Context & BotContext) {
  try {
    await ctx.sendChatAction('upload_photo');
    const loading = await ctx.reply('⏳ Загружаю снимок…');
    const image = await earthApi.getLatestEarthImage('natural');
    
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 <b>Снимок Земли</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA Earth Polychromatic Imaging Camera (EPIC)</i>`,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🌿 Natural', 'earth_type_natural'), Markup.button.callback('🎨 Enhanced', 'earth_type_enhanced')]
      ])
    });
    try { await ctx.deleteMessage(loading.message_id); } catch {}
  } catch (error) {
    console.error('Earth Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('NASA API Error: 503') || msg.includes('NASA API Error: 502') || msg.includes('NASA API Error: 504')) {
      await ctx.reply('⚠️ Сервис NASA EPIC временно недоступен (5xx). Попробуйте позже.', Markup.inlineKeyboard([
        Markup.button.callback('🔄 Повторить', 'earth_retry')
      ]));
      return;
    }
    if (msg.includes('NASA API Error: 429')) {
      await ctx.reply('⚠️ Превышен лимит запросов NASA (429). Подождите немного и повторите.', Markup.inlineKeyboard([
        Markup.button.callback('🔄 Повторить', 'earth_retry')
      ]));
      return;
    }
    await ctx.reply('❌ Произошла ошибка при получении снимка Земли. Попробуйте позже.', Markup.inlineKeyboard([
      Markup.button.callback('🔄 Повторить', 'earth_retry')
    ]));
  }
} 

export async function handleEarthRetry(ctx: Context & BotContext) {
  try { await ctx.answerCbQuery(); } catch {}
  try { await ctx.deleteMessage(); } catch {}
  return handleEarth(ctx);
}

export async function handleEarthType(ctx: Context & BotContext) {
  const data = (ctx.callbackQuery as any)?.data as string | undefined;
  const type = data === 'earth_type_enhanced' ? 'enhanced' : 'natural';
  try { await ctx.answerCbQuery(); } catch {}
  try { await ctx.deleteMessage(); } catch {}
  await ctx.sendChatAction('upload_photo');
  const loading = await ctx.reply('⏳ Загружаю снимок…');
  try {
    const image = await earthApi.getLatestEarthImage(type as 'natural' | 'enhanced');
    await ctx.replyWithPhoto(image.image, {
      caption: `🌍 <b>Снимок Земли (${type === 'natural' ? 'Natural' : 'Enhanced'})</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA EPIC</i>`,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🌿 Natural', 'earth_type_natural'), Markup.button.callback('🎨 Enhanced', 'earth_type_enhanced')]
      ])
    });
  } catch (error) {
    console.error('Earth Type Error:', error);
    await ctx.reply('❌ Не удалось получить снимок. Попробуйте позже.', Markup.inlineKeyboard([
      Markup.button.callback('🔄 Повторить', 'earth_retry')
    ]));
  } finally {
    try { await ctx.deleteMessage((loading as any).message_id); } catch {}
  }
}