import { InlineKeyboardMarkup } from 'telegraf/types';

export function createPhotoNavigationKeyboard(currentIndex: number, totalPhotos: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⏮️', callback_data: 'first_photo' },
        { text: '⬅️', callback_data: 'prev_photo' },
        { text: `${currentIndex + 1}/${totalPhotos}`, callback_data: 'photo_info' },
        { text: '➡️', callback_data: 'next_photo' },
        { text: '⏭️', callback_data: 'last_photo' },
        { text: '❌', callback_data: 'close_photos' }
      ]
    ]
  };
} 