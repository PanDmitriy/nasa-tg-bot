import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { getUserName } from '../../../shared/lib/telegramHelpers';

export async function handleStart(ctx: BotContext) {
  const userName = getUserName(ctx);
  
  const message = `🌌 <b>Добро пожаловать в космическое путешествие!</b>\n\n` +
    `Привет, ${userName}! 👋 Я твой персональный гид по Вселенной. Каждый день NASA открывает что-то удивительное — и я покажу тебе это первым.\n\n` +
    `✨ <b>Что я умею:</b>\n` +
    `• Показывать потрясающие фото космоса каждый день\n` +
    `• Отслеживать космическую погоду в реальном времени\n` +
    `• Находить астероиды, приближающиеся к Земле\n` +
    `• И многое другое!\n\n` +
    `🚀 <b>Начни исследование:</b>`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌌 Фото дня', 'quick_apod'),
      Markup.button.callback('🌍 Земля', 'quick_earth')
    ],
    [
      Markup.button.callback('☄️ Астероиды', 'quick_asteroids'),
      Markup.button.callback('🌊 Косм. погода', 'quick_donki')
    ],
    [
      Markup.button.callback('🖼️ Галерея', 'quick_images'),
      Markup.button.callback('📋 Все команды', 'help_menu')
    ]
  ]);

  await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
} 