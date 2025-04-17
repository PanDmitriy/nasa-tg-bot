import { Telegraf, Context } from 'telegraf';
import { code } from 'telegraf/format';
import { nasa } from './nasa.js';
import { Command } from './types/index.js';
import { config } from './config.js';
import { formatters } from './utils/formatters.js';
import { errorHandler } from './utils/errorHandler.js';

interface BotContext extends Context {
  session?: any;
}

const bot = new Telegraf<BotContext>(config.bot.token);
bot.telegram.setMyCommands(config.bot.commands);

/** Обработка команд */
bot.command('start', async (ctx) => {
  const commands = config.bot.commands
    .filter(cmd => cmd.command !== 'start')
    .map(cmd => `/${cmd.command} - ${cmd.description}`)
    .join('\n');

  await ctx.reply(`Добро пожаловать в NASA бот! Используйте команды:\n${commands}`);
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
    await ctx.reply(errorHandler.handleError(error));
  }
});

bot.command('iss', async (ctx) => {
  try {
    const data = await nasa.getISSLocation();
    const message = formatters.formatISSMessage(data);
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🗺️ Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}` },
          { text: '📍 Яндекс.Карты', url: `https://yandex.ru/maps/?text=${data.latitude},${data.longitude}` }
        ],
      ]
    };

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    await ctx.reply(errorHandler.handleError(error));
  }
});

bot.command('earth', async (ctx) => {
  try {
    const image = await nasa.getEarthImage();
    
    if (!image || !image.date) {
      throw errorHandler.createError('Не удалось получить данные о снимке Земли', 'NO_IMAGE_DATA');
    }

    if (!image.image) {
      throw errorHandler.createError('Не удалось получить URL изображения', 'NO_IMAGE_URL');
    }

    const message = formatters.formatEarthMessage(image);
    await ctx.replyWithPhoto(image.image, {
      caption: message,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    await ctx.reply(errorHandler.handleError(error));
  }
});

bot.command('asteroids', async (ctx) => {
  try {
    const asteroids = await nasa.getAsteroids(7);
    const message = formatters.formatAsteroidMessage(asteroids);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    await ctx.reply(errorHandler.handleError(error));
  }
});

/** Start bot */
bot.launch();

/** Обработка остановки NODE */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 