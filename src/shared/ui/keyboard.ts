import { InlineKeyboardMarkup } from 'telegraf/types';

export function createPhotoNavigationKeyboard(currentIndex: number, totalPhotos: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⬅️ Назад', callback_data: 'prev_photo' },
        { text: `${currentIndex + 1}/${totalPhotos}`, callback_data: 'photo_info' },
        { text: 'Вперед ➡️', callback_data: 'next_photo' }
      ]
    ]
  };
} 