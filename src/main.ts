import dotenv from 'dotenv';
dotenv.config();

import { Telegraf, Context } from 'telegraf';
import { code } from 'telegraf/format';
import { nasa } from './nasa.js';
import { Command, NasaPhoto, ISSLocation } from './types/index.js';

interface BotContext extends Context {
  session?: any;
}

const COMMANDS: Command[] = [
  { command: "start", description: "Запуск" },
  { command: "apod", description: "NASA. Астрономическое фото дня" },
  { command: "iss", description: "Показывает, где сейчас находится Международная космическая станция" }
];

const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN || '');
bot.telegram.setMyCommands(COMMANDS);

/** Обработка команд */
bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать в NASA бот! Используйте команды:\n/apod - получить фото дня\n/iss - узнать где МКС');
});

/** NASA */
bot.command('apod', async (ctx) => {
  try {
    const photo = await nasa.getPhotoOfDay();
    await ctx.replyWithPhoto(photo.url, { caption: photo.title });
    await ctx.reply(photo.explanation);
    if (photo.copyright) {
      await ctx.reply(`Автор ${photo.copyright}`);
    }
  } catch (error) {
    await ctx.reply('Произошла ошибка при получении фото дня');
    console.error('Error in apod command:', error);
  }
});

bot.command('iss', async (ctx) => {
  try {
    const data = await nasa.getISSLocation();
    if (!data || data.message !== 'success') {
      return ctx.reply('🚫 Не удалось получить данные о местоположении МКС.');
    }

    const { latitude, longitude } = data.iss_position;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=4/${latitude}/${longitude}`;

    await ctx.reply(`🛰️ Сейчас МКС находится в точке:\n\n🌍 Широта: ${latitude}\n🌐 Долгота: ${longitude}\n\n📍 [Открыть на карте](${mapUrl})`, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    await ctx.reply('Произошла ошибка при получении данных о МКС');
    console.error('Error in iss command:', error);
  }
});

/** Start bot */
bot.launch();

/** Обработка остановки NODE */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 