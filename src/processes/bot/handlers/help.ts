import { Context } from 'telegraf';
import { BotContext } from '../types';

export async function handleHelp(ctx: Context & BotContext): Promise<void> {
  const message = `
🚀 <b>NASA Telegram Bot - Помощь</b>

<b>Основные команды:</b>
• /earth - Получить фотографию Земли
• /iss - Узнать текущее положение МКС
• /asteroids - Получить информацию о ближайших астероидах
• /apod - Получить фотографию дня от NASA
• /help - Показать это сообщение

<i>Все данные предоставлены NASA API</i>
  `.trim();

  await ctx.reply(message, { parse_mode: 'HTML' });
} 