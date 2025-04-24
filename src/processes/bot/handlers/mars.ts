import { Context } from 'telegraf';
import { BotContext } from '../types';
import { MarsApi } from '../../../features/mars/api';
import { createPhotoNavigationKeyboard } from '../../../shared/ui/keyboard';
import { MarsPhoto } from '../../../features/mars/api';

const marsApi = new MarsApi(process.env.NASA_API_KEY || '');

interface MarsSession {
  marsPhotos?: MarsPhoto[];
  currentPhotoIndex?: number;
}

async function sendMarsPhoto(ctx: Context & BotContext & { session?: MarsSession }, index: number) {
  if (!ctx.session?.marsPhotos) return;

  const photos = ctx.session.marsPhotos;
  const photo = photos[index];

  await ctx.replyWithPhoto(photo.img_src, {
    caption: `🚀 Фотография с марсохода ${photo.rover.name}\n` +
      `📅 Дата: ${new Date(photo.earth_date).toLocaleString('ru-RU')}\n` +
      `📷 Камера: ${photo.camera.full_name}\n` +
      `🌞 Сол: ${photo.sol}`,
    reply_markup: createPhotoNavigationKeyboard(index, photos.length)
  });
}

export async function handleMars(ctx: Context & BotContext): Promise<void> {
  try {
    await ctx.reply('🪐 Получаю последние фотографии с Марса...');

    // Пробуем получить фотографии с разными параметрами
    let photos = await marsApi.getLatestMarsPhotos('curiosity', 1000, 'NAVCAM');
    
    if (photos.length === 0) {
      // Если не нашли с NAVCAM, пробуем другие камеры
      photos = await marsApi.getLatestMarsPhotos('curiosity', 1000, 'MAST');
    }

    if (photos.length === 0) {
      // Если все еще нет фотографий, пробуем другой сол
      photos = await marsApi.getLatestMarsPhotos('curiosity', 500);
    }

    if (photos.length === 0) {
      throw new Error('Не удалось найти фотографии с Марса');
    }

    // Сохраняем фотографии в сессию
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.marsPhotos = photos;
    ctx.session.currentPhotoIndex = 0;

    // Отправляем первую фотографию
    await sendMarsPhoto(ctx, 0);
  } catch (error) {
    console.error('Ошибка в обработчике Марса:', error);
    await ctx.reply('❌ К сожалению, не удалось получить фотографии с Марса. Попробуйте позже.');
  }
}

export async function handleMarsNavigation(ctx: Context & BotContext & { session?: MarsSession }) {
  if (!ctx.session?.marsPhotos || ctx.session.currentPhotoIndex === undefined) {
    await ctx.reply('Сначала запросите фотографии с Марса командой /mars');
    return;
  }

  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;

  const photos = ctx.session.marsPhotos;
  let newIndex = ctx.session.currentPhotoIndex;

  if (callbackQuery.data === 'prev_photo') {
    newIndex = Math.max(0, newIndex - 1);
  } else if (callbackQuery.data === 'next_photo') {
    newIndex = Math.min(photos.length - 1, newIndex + 1);
  }

  if (newIndex !== ctx.session.currentPhotoIndex) {
    ctx.session.currentPhotoIndex = newIndex;
    await ctx.answerCbQuery();
    await sendMarsPhoto(ctx, newIndex);
  } else {
    await ctx.answerCbQuery('Это первая/последняя фотография');
  }
} 