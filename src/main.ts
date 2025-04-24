import { Telegraf, Context } from 'telegraf';
import { nasa } from './nasa.js';
import { UserSession, PhotoViewState } from './types/index.js';
import { config } from './config.js';
import { formatters } from './utils/formatters.js';
import { errorHandler } from './utils/errorHandler.js';

console.log('Bot token:', config.bot.token);

interface BotContext extends Context {
  session?: UserSession;
}

const bot = new Telegraf<BotContext>(config.bot.token);

// Добавляем middleware для сессии
const sessions = new Map<number, UserSession>();

bot.use((ctx, next) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    if (!sessions.has(chatId)) {
      sessions.set(chatId, {});
    }
    ctx.session = sessions.get(chatId);
  }
  return next();
});

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

const createPhotoNavigationKeyboard = (currentIndex: number, totalPhotos: number) => {
  const keyboard = [];
  
  // Кнопки навигации
  const navButtons = [];
  
  // Кнопка "В начало" показывается, если мы не на первой фотографии
  if (currentIndex > 0) {
    navButtons.push({ text: '⏮️ В начало', callback_data: 'first_photo' });
  }
  
  // Кнопка "Назад" показывается, если мы не на первой фотографии
  if (currentIndex > 0) {
    navButtons.push({ text: '⬅️ Назад', callback_data: 'prev_photo' });
  }
  
  // Информация о текущей фотографии
  keyboard.push([{ text: `📸 ${currentIndex + 1} из ${totalPhotos}`, callback_data: 'photo_info' }]);
  
  // Кнопки "Вперед" и "В конец"
  const nextButtons = [];
  if (currentIndex < totalPhotos - 1) {
    nextButtons.push({ text: 'Вперед ➡️', callback_data: 'next_photo' });
  }
  if (currentIndex < totalPhotos - 1) {
    nextButtons.push({ text: 'В конец ⏭️', callback_data: 'last_photo' });
  }
  if (nextButtons.length > 0) {
    keyboard.push(nextButtons);
  }

  // Кнопка закрытия
  keyboard.push([{ text: '❌ Закрыть', callback_data: 'close_photos' }]);

  return { inline_keyboard: keyboard };
};

const updatePhotoMessage = async (ctx: BotContext, state: PhotoViewState) => {
  if (!state.photos || state.photos.length === 0) {
    await ctx.reply('К сожалению, фотографии не найдены. Попробуйте позже.');
    return;
  }

  const photo = state.photos[state.currentIndex];
  const keyboard = createPhotoNavigationKeyboard(state.currentIndex, state.photos.length);
  
  try {
    // Отправляем сообщение о загрузке
    const loadingMessage = await ctx.reply('🔄 Загрузка фотографии...');
    
    // Добавляем дополнительную информацию для форматирования
    const photoWithInfo = {
      ...photo,
      currentIndex: state.currentIndex,
      totalPhotos: state.photos.length
    };
    
    if (state.messageId) {
      try {
        await ctx.telegram.editMessageMedia(
          ctx.chat!.id,
          state.messageId,
          undefined,
          {
            type: 'photo',
            media: photo.img_src,
            caption: formatters.formatMarsPhotoMessage(photoWithInfo),
            parse_mode: 'Markdown'
          },
          { reply_markup: keyboard }
        );
        // Удаляем сообщение о загрузке
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id);
      } catch (error) {
        // Если не удалось обновить сообщение, отправляем новое
        const message = await ctx.replyWithPhoto(photo.img_src, {
          caption: formatters.formatMarsPhotoMessage(photoWithInfo),
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        state.messageId = message.message_id;
        // Удаляем сообщение о загрузке
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id);
      }
    } else {
      const message = await ctx.replyWithPhoto(photo.img_src, {
        caption: formatters.formatMarsPhotoMessage(photoWithInfo),
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      state.messageId = message.message_id;
      // Удаляем сообщение о загрузке
      await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMessage.message_id);
    }
  } catch (error) {
    console.error('Error updating photo message:', error);
    await ctx.reply('Произошла ошибка при загрузке фотографии. Попробуйте еще раз.');
  }
};

// Обработчик callback-запросов
bot.action(/first_photo|prev_photo|next_photo|last_photo|close_photos|photo_info/, async (ctx) => {
  if (!ctx.session) {
    await ctx.answerCbQuery('Сессия не инициализирована. Пожалуйста, начните заново.');
    return;
  }

  if (!ctx.session.photoViewState) {
    await ctx.answerCbQuery('Состояние просмотра фотографий не найдено. Пожалуйста, начните заново.');
    return;
  }
  
  const state = ctx.session.photoViewState;
  const callbackData = (ctx.callbackQuery as any).data;
  
  try {
    switch (callbackData) {
      case 'first_photo':
        state.currentIndex = 0;
        await updatePhotoMessage(ctx, state);
        break;
        
      case 'prev_photo':
        if (state.currentIndex > 0) {
          state.currentIndex--;
          await updatePhotoMessage(ctx, state);
        }
        break;
        
      case 'next_photo':
        if (state.currentIndex < state.photos.length - 1) {
          state.currentIndex++;
          await updatePhotoMessage(ctx, state);
        }
        break;
        
      case 'last_photo':
        state.currentIndex = state.photos.length - 1;
        await updatePhotoMessage(ctx, state);
        break;
        
      case 'close_photos':
        if (state.messageId) {
          try {
            await ctx.telegram.deleteMessage(ctx.chat!.id, state.messageId);
          } catch (error) {
            console.error('Error deleting message:', error);
          }
        }
        delete ctx.session.photoViewState;
        break;

      case 'photo_info':
        // Просто закрываем запрос, ничего не делаем
        break;
    }
  } catch (error) {
    console.error('Error handling photo navigation:', error);
    await ctx.answerCbQuery('Произошла ошибка при навигации. Попробуйте еще раз.');
  }
  
  await ctx.answerCbQuery();
});

// Обработчики команд для марсоходов
bot.command('mars', async (ctx) => {
  try {
    const photos = await nasa.getLatestMarsPhotos('curiosity');
    if (!photos || photos.length === 0) {
      await ctx.reply('К сожалению, не удалось получить фотографии с марсохода. Попробуйте позже.');
      return;
    }

    if (!ctx.session) {
      ctx.session = {};
    }
    
    ctx.session.photoViewState = {
      rover: 'curiosity',
      photos,
      currentIndex: 0
    };
    
    await updatePhotoMessage(ctx, ctx.session.photoViewState);
  } catch (error) {
    console.error('Error in mars command:', error);
    await ctx.reply('Произошла ошибка при получении фотографий с марсохода. Попробуйте позже.');
  }
});

bot.command('curiosity', async (ctx) => {
  try {
    const photos = await nasa.getLatestMarsPhotos('curiosity');
    if (!photos || photos.length === 0) {
      await ctx.reply('К сожалению, не удалось получить фотографии с марсохода Curiosity. Попробуйте позже.');
      return;
    }

    if (!ctx.session) {
      ctx.session = {};
    }
    
    ctx.session.photoViewState = {
      rover: 'curiosity',
      photos,
      currentIndex: 0
    };
    
    await updatePhotoMessage(ctx, ctx.session.photoViewState);
  } catch (error) {
    console.error('Error in curiosity command:', error);
    await ctx.reply('Произошла ошибка при получении фотографий с марсохода Curiosity. Попробуйте позже.');
  }
});

bot.command('perseverance', async (ctx) => {
  try {
    const photos = await nasa.getLatestMarsPhotos('perseverance');
    if (!ctx.session) ctx.session = {};
    
    ctx.session.photoViewState = {
      rover: 'perseverance',
      photos,
      currentIndex: 0
    };
    
    await updatePhotoMessage(ctx, ctx.session.photoViewState);
  } catch (error) {
    await ctx.reply(errorHandler.handleError(error));
  }
});

/** Start bot */
bot.launch();

/** Обработка остановки NODE */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 