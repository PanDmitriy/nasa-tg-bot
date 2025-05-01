import { Context } from 'telegraf';
import { BotContext } from '../types';
import { handleMarsNavigation } from './mars';
import { createPhotoNavigationKeyboard } from '../../../shared/ui/keyboard';
import { MarsPhoto } from '../../../features/mars/api';

interface PhotoViewState {
  photos: MarsPhoto[];
  currentIndex: number;
  messageId?: number;
}

export async function handlePhotoNavigation(ctx: Context & BotContext) {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;

  // Обработка навигации по фотографиям Марса
  if (callbackQuery.data.startsWith('prev_photo') || callbackQuery.data.startsWith('next_photo')) {
    await handleMarsNavigation(ctx);
    return;
  }

  if (!ctx.session) {
    await ctx.answerCbQuery('Сессия не инициализирована. Пожалуйста, начните заново.');
    return;
  }

  if (!ctx.session.photoViewState) {
    await ctx.answerCbQuery('Состояние просмотра фотографий не найдено. Пожалуйста, начните заново.');
    return;
  }

  const state = ctx.session.photoViewState;

  try {
    switch (callbackQuery.data) {
      case 'first_photo':
        state.currentIndex = 0;
        await updatePhotoMessage(ctx, state);
        break;

      case 'last_photo':
        state.currentIndex = state.photos.length - 1;
        await updatePhotoMessage(ctx, state);
        break;

      case 'close_photos':
        if (state.messageId) {
          await ctx.telegram.deleteMessage(ctx.chat!.id, state.messageId);
        }
        ctx.session.photoViewState = undefined;
        break;

      case 'photo_info':
        await ctx.answerCbQuery(`Фото ${state.currentIndex + 1} из ${state.photos.length}`);
        break;
    }
  } catch (error) {
    console.error('Error handling photo navigation:', error);
    await ctx.answerCbQuery('Произошла ошибка при обработке действия');
  }
}

async function updatePhotoMessage(ctx: Context & BotContext, state: PhotoViewState) {
  if (!state.photos || state.photos.length === 0) {
    await ctx.reply('К сожалению, фотографии не найдены. Попробуйте позже.');
    return;
  }

  const photo = state.photos[state.currentIndex];
  const keyboard = createPhotoNavigationKeyboard(state.currentIndex, state.photos.length);

  try {
    if (state.messageId) {
      await ctx.telegram.editMessageMedia(
        ctx.chat!.id,
        state.messageId,
        undefined,
        {
          type: 'photo',
          media: photo.img_src,
          caption: formatPhotoMessage(photo, state.currentIndex, state.photos.length),
          parse_mode: 'HTML'
        },
        { reply_markup: keyboard }
      );
    } else {
      const message = await ctx.replyWithPhoto(photo.img_src, {
        caption: formatPhotoMessage(photo, state.currentIndex, state.photos.length),
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      state.messageId = message.message_id;
    }
  } catch (error) {
    console.error('Error updating photo message:', error);
    await ctx.reply('Произошла ошибка при обновлении фотографии. Попробуйте еще раз.');
  }
}

function formatPhotoMessage(photo: MarsPhoto, currentIndex: number, totalPhotos: number): string {
  return `📸 Фото с Марса\n\n` +
    `Камера: ${photo.camera.full_name}\n` +
    `Марсоход: ${photo.rover.name}\n` +
    `Дата: ${new Date(photo.earth_date).toLocaleString('ru-RU')}\n` +
    `Сол: ${photo.sol}\n\n` +
    `Фото ${currentIndex + 1} из ${totalPhotos}`;
} 