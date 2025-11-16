import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';

export async function handleMainMenu(ctx: Context & BotContext) {
  const message = `📋 <b>Главное меню</b>\n\n` +
    `Выберите интересующую команду:`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('🌌 Фото дня', 'quick_apod'),
      Markup.button.callback('🌍 Земля', 'quick_earth')
    ],
    [
      Markup.button.callback('☄️ Астероиды', 'quick_asteroids'),
      Markup.button.callback('🖼️ Галерея', 'quick_images')
    ],
    [
      Markup.button.callback('🌊 Косм. погода', 'quick_donki'),
      Markup.button.callback('📅 Подписки', 'quick_subscribe')
    ],
    [
      Markup.button.callback('❓ Помощь', 'help_menu'),
      Markup.button.callback('⚙️ Настройки', 'settings_menu')
    ]
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

// Утилита для добавления кнопки меню
export function addMainMenuButton(keyboard: any) {
  // Добавляет кнопку "🏠 Меню" к существующей клавиатуре
  if (!keyboard.inline_keyboard) {
    keyboard.inline_keyboard = [];
  }
  keyboard.inline_keyboard.push([
    { text: '🏠 Меню', callback_data: 'main_menu' }
  ]);
  return keyboard;
}

