import { Context } from 'telegraf';
import { BotContext } from '../types';
import { DonkiApi } from '../../../features/donki/api';
import {
  formatCME,
  formatFlare,
  formatSEP,
  formatGST,
  formatIPS,
  formatNotification,
  formatWSAEnlil,
  formatCMESimple,
  formatFlareSimple,
  formatSEPSimple,
  formatGSTSimple,
  formatIPSSimple,
  formatNotificationSimple,
  formatWSAEnlilSimple,
} from '../../../features/donki/formatters';
import { InlineKeyboardMarkup } from 'telegraf/types';

const donkiApi = new DonkiApi();

function createDonkiMainMenu(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🌊 CME', callback_data: 'donki_cme' },
        { text: '☀️ Вспышки', callback_data: 'donki_flares' },
      ],
      [
        { text: '⚡ SEP', callback_data: 'donki_sep' },
        { text: '🌍 Геобури', callback_data: 'donki_gst' },
      ],
      [
        { text: '💥 IPS', callback_data: 'donki_ips' },
        { text: '📢 Уведомления', callback_data: 'donki_notifications' },
      ],
      [
        { text: '🌐 WSA-ENLIL', callback_data: 'donki_wsaenlil' },
      ],
      [
        { text: '❌ Закрыть', callback_data: 'donki_close' },
      ],
    ],
  };
}

function createDateMenu(eventType: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '📅 Сегодня', callback_data: `donki_${eventType}_today` },
        { text: '📅 Неделя', callback_data: `donki_${eventType}_week` },
      ],
      [
        { text: '📅 Месяц', callback_data: `donki_${eventType}_month` },
        { text: '📅 Последние 7 дней', callback_data: `donki_${eventType}_7days` },
      ],
      [
        { text: '🔙 Назад', callback_data: 'donki_menu' },
      ],
    ],
  };
}

function createFlareClassMenu(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: 'Все', callback_data: 'donki_flares_class_ALL' },
        { text: 'X-класс', callback_data: 'donki_flares_class_X' },
      ],
      [
        { text: 'M-класс', callback_data: 'donki_flares_class_M' },
        { text: 'C-класс', callback_data: 'donki_flares_class_C' },
      ],
      [
        { text: '🔙 Назад', callback_data: 'donki_menu' },
      ],
    ],
  };
}

function getDateRange(days: number): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return { startDate, endDate };
}

function createKeyboardWithModeToggle(
  items: any[],
  type: string,
  currentIndex: number,
  isSimpleMode: boolean
): InlineKeyboardMarkup {
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [],
  };

  if (items.length > 1) {
    const buttons = [];
    
    // Кнопка "Предыдущее" показывается, если не на первом элементе
    if (currentIndex > 0) {
      buttons.push({ text: '⬅️ Предыдущее', callback_data: `donki_${type}_item_${currentIndex - 1}` });
    }
    
    // Кнопка "Следующее" показывается, если не на последнем элементе
    if (currentIndex < items.length - 1) {
      buttons.push({ text: '➡️ Следующее', callback_data: `donki_${type}_item_${currentIndex + 1}` });
    }
    
    if (buttons.length > 0) {
      keyboard.inline_keyboard.push(buttons);
    }
  }

  keyboard.inline_keyboard.push([
    {
      text: isSimpleMode ? '📊 Подробный режим' : '💬 Простой режим',
      callback_data: 'donki_toggle_mode',
    },
    { text: '🔙 Назад к меню', callback_data: 'donki_menu' },
  ]);

  return keyboard;
}

function formatDonkiItem(
  item: any,
  type: string,
  isSimpleMode: boolean
): string {
  if (isSimpleMode) {
    switch (type) {
      case 'cme':
        return formatCMESimple(item);
      case 'flares':
        return formatFlareSimple(item);
      case 'sep':
        return formatSEPSimple(item);
      case 'gst':
        return formatGSTSimple(item);
      case 'ips':
        return formatIPSSimple(item);
      case 'notifications':
        return formatNotificationSimple(item);
      case 'wsaenlil':
        return formatWSAEnlilSimple(item);
      default:
        return '';
    }
  } else {
    switch (type) {
      case 'cme':
        return formatCME(item);
      case 'flares':
        return formatFlare(item);
      case 'sep':
        return formatSEP(item);
      case 'gst':
        return formatGST(item);
      case 'ips':
        return formatIPS(item);
      case 'notifications':
        return formatNotification(item);
      case 'wsaenlil':
        return formatWSAEnlil(item);
      default:
        return '';
    }
  }
}

export async function handleDonki(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const modeText = isSimpleMode ? '💬 Простой режим' : '📊 Подробный режим';
    
    const message = `
🌌 <b>DONKI - Космическая погода</b>

${modeText} (можно переключить после выбора события)

Выберите тип события космической погоды для просмотра:

• <b>CME</b> - Корональные выбросы массы
• <b>Вспышки</b> - Солнечные вспышки
• <b>SEP</b> - Солнечные энергичные частицы
• <b>Геобури</b> - Геомагнитные бури
• <b>IPS</b> - Межпланетные удары
• <b>Уведомления</b> - Последние уведомления
• <b>WSA-ENLIL</b> - Симуляции моделирования

<i>Все данные из базы DONKI NASA</i>
    `.trim();

    const menu = createDonkiMainMenu();
    menu.inline_keyboard.push([
      {
        text: isSimpleMode ? '📊 Переключить на подробный' : '💬 Переключить на простой',
        callback_data: 'donki_set_mode',
      },
    ]);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });
  } catch (error) {
    console.error('DONKI Error:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке меню DONKI.');
  }
}

export async function handleDonkiMenu(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const modeText = isSimpleMode ? '💬 Простой режим' : '📊 Подробный режим';
    
    const message = `
🌌 <b>DONKI - Космическая погода</b>

${modeText} (можно переключить после выбора события)

Выберите тип события:
    `.trim();

    const menu = createDonkiMainMenu();
    menu.inline_keyboard.push([
      {
        text: isSimpleMode ? '📊 Переключить на подробный' : '💬 Переключить на простой',
        callback_data: 'donki_set_mode',
      },
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });
  } catch (error) {
    console.error('DONKI Menu Error:', error);
  }
}

export async function handleDonkiCME(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для CME:', {
      reply_markup: createDateMenu('cme'),
    });
  } catch (error) {
    console.error('DONKI CME Error:', error);
  }
}

export async function handleDonkiCMEData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка CME...');
    const { startDate, endDate } = getDateRange(days);
    const cmes = await donkiApi.getCMEs(startDate, endDate);

    if (cmes.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено корональных выбросов массы за выбранный период.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const cme = cmes[0];
    let message = formatDonkiItem(cme, 'cme', isSimpleMode);

    if (cmes.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${cmes.length} событий`;
    }

    const keyboard = createKeyboardWithModeToggle(cmes, 'cme', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'cme', items: cmes, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI CME Data Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении данных о CME. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiFlares(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для вспышек:', {
      reply_markup: createDateMenu('flares'),
    });
  } catch (error) {
    console.error('DONKI Flares Error:', error);
  }
}

export async function handleDonkiFlaresPeriod(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.editMessageText('☀️ Выберите класс вспышек:', {
      reply_markup: createFlareClassMenu(),
    });
    ctx.session.donkiFlaresPeriod = days;
  } catch (error) {
    console.error('DONKI Flares Period Error:', error);
  }
}

export async function handleDonkiFlaresData(ctx: Context & BotContext, classType: string = 'ALL', days?: number) {
  if (!ctx.session) ctx.session = {};
  const period = days || ctx.session.donkiFlaresPeriod || 7;
  try {
    await ctx.answerCbQuery('Загрузка вспышек...');
    const { startDate, endDate } = getDateRange(period);
    const flares = await donkiApi.getFlares(startDate, endDate, 'M2M_CATALOG', classType);

    if (flares.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено солнечных вспышек за выбранный период.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const flare = flares[0];
    let message = formatDonkiItem(flare, 'flares', isSimpleMode);

    if (flares.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${flares.length} событий`;
    }

    const keyboard = createKeyboardWithModeToggle(flares, 'flares', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'flares', items: flares, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI Flares Data Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении данных о вспышках. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiSEP(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для SEP:', {
      reply_markup: createDateMenu('sep'),
    });
  } catch (error) {
    console.error('DONKI SEP Error:', error);
  }
}

export async function handleDonkiSEPData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка SEP...');
    const { startDate, endDate } = getDateRange(days);
    const seps = await donkiApi.getSEPs(startDate, endDate);

    if (seps.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено событий SEP за выбранный период.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const sep = seps[0];
    let message = formatDonkiItem(sep, 'sep', isSimpleMode);

    if (seps.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${seps.length} событий`;
    }

    const keyboard = createKeyboardWithModeToggle(seps, 'sep', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'sep', items: seps, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI SEP Data Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении данных о SEP. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiGST(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для геомагнитных бурь:', {
      reply_markup: createDateMenu('gst'),
    });
  } catch (error) {
    console.error('DONKI GST Error:', error);
  }
}

export async function handleDonkiGSTData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка геобурь...');
    const { startDate, endDate } = getDateRange(days);
    const gsts = await donkiApi.getGSTs(startDate, endDate);

    if (gsts.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено геомагнитных бурь за выбранный период.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const gst = gsts[0];
    let message = formatDonkiItem(gst, 'gst', isSimpleMode);

    if (gsts.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${gsts.length} событий`;
    }

    const keyboard = createKeyboardWithModeToggle(gsts, 'gst', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'gst', items: gsts, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI GST Data Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении данных о геомагнитных бурях. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiIPS(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для межпланетных ударов:', {
      reply_markup: createDateMenu('ips'),
    });
  } catch (error) {
    console.error('DONKI IPS Error:', error);
  }
}

export async function handleDonkiIPSData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка IPS...');
    const { startDate, endDate } = getDateRange(days);
    const ipss = await donkiApi.getIPSs(startDate, endDate);

    if (ipss.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено межпланетных ударов за выбранный период.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const ips = ipss[0];
    let message = formatDonkiItem(ips, 'ips', isSimpleMode);

    if (ipss.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${ipss.length} событий`;
    }

    const keyboard = createKeyboardWithModeToggle(ipss, 'ips', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'ips', items: ipss, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI IPS Data Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении данных о межпланетных ударах. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiNotifications(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка уведомлений...');
    const { startDate, endDate } = getDateRange(7);
    const notifications = await donkiApi.getNotifications(startDate, endDate);

    if (notifications.length === 0) {
      await ctx.reply(
        `❌ Не найдено уведомлений за последние 7 дней.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const notification = notifications[0];
    let message = formatDonkiItem(notification, 'notifications', isSimpleMode);

    if (notifications.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${notifications.length} уведомлений`;
    }

    const keyboard = createKeyboardWithModeToggle(notifications, 'notifications', 0, isSimpleMode);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'notifications', items: notifications, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI Notifications Error:', error);
    await ctx.reply(
      '❌ Ошибка при получении уведомлений. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiWSAEnlil(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка симуляций...');
    const { startDate, endDate } = getDateRange(7);
    const sims = await donkiApi.getWSAEnlilSimulations(startDate, endDate);

    if (sims.length === 0) {
      await ctx.editMessageText(
        `❌ Не найдено симуляций WSA-ENLIL за последние 7 дней.`,
        { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
      );
      return;
    }

    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const sim = sims[0];
    let message = formatDonkiItem(sim, 'wsaenlil', isSimpleMode);

    if (sims.length > 1) {
      message += `\n\n📊 <b>Всего найдено:</b> ${sims.length} симуляций`;
    }

    const keyboard = createKeyboardWithModeToggle(sims, 'wsaenlil', 0, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    ctx.session.donkiData = { type: 'wsaenlil', items: sims, currentIndex: 0 };
  } catch (error) {
    console.error('DONKI WSAEnlil Error:', error);
    await ctx.editMessageText(
      '❌ Ошибка при получении симуляций. Попробуйте позже.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'donki_menu' }]] } }
    );
  }
}

export async function handleDonkiItemNavigation(ctx: Context & BotContext, data: string) {
  try {
    if (!ctx.session) ctx.session = {};
    const match = data.match(/donki_(\w+)_item_(\d+)/);
    if (!match) {
      await ctx.answerCbQuery('Неверный формат данных');
      return;
    }

    const [, type, indexStr] = match;
    const targetIndex = parseInt(indexStr, 10);

    if (!ctx.session.donkiData || ctx.session.donkiData.type !== type) {
      await ctx.answerCbQuery('Данные не найдены. Начните заново.');
      return;
    }

    const { items, currentIndex } = ctx.session.donkiData;

    // Проверка границ
    if (targetIndex < 0 || targetIndex >= items.length) {
      await ctx.answerCbQuery('Достигнут конец списка');
      return;
    }

    // Если индекс не изменился, не обновляем сообщение
    if (targetIndex === currentIndex) {
      await ctx.answerCbQuery('Вы уже на этом элементе');
      return;
    }

    ctx.session.donkiData.currentIndex = targetIndex;
    const item = items[targetIndex];
    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;

    const message = formatDonkiItem(item, type, isSimpleMode) + `\n\n📊 <b>${targetIndex + 1} из ${items.length}</b>`;
    const keyboard = createKeyboardWithModeToggle(items, type, targetIndex, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery();
  } catch (error: any) {
    // Обработка ошибки "message is not modified"
    if (error?.response?.error_code === 400 && error?.response?.description?.includes('message is not modified')) {
      await ctx.answerCbQuery('Вы уже на этом элементе');
      return;
    }
    console.error('DONKI Navigation Error:', error);
    await ctx.answerCbQuery('Ошибка навигации');
  }
}

export async function handleDonkiClose(ctx: Context & BotContext) {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error('DONKI Close Error:', error);
  }
}

export async function handleDonkiToggleMode(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    if (!ctx.session.donkiData) {
      await ctx.answerCbQuery('Нет активных данных для переключения режима');
      return;
    }

    // Переключаем режим
    ctx.session.donkiSimpleMode = !(ctx.session.donkiSimpleMode ?? false);

    // Переформатируем текущий элемент
    const { items, currentIndex, type } = ctx.session.donkiData;
    const item = items[currentIndex];
    const isSimpleMode = ctx.session.donkiSimpleMode;

    const message = formatDonkiItem(item, type, isSimpleMode) + `\n\n📊 <b>${currentIndex + 1} из ${items.length}</b>`;
    const keyboard = createKeyboardWithModeToggle(items, type, currentIndex, isSimpleMode);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });

    await ctx.answerCbQuery(isSimpleMode ? 'Переключено на простой режим' : 'Переключено на подробный режим');
  } catch (error) {
    console.error('DONKI Toggle Mode Error:', error);
    await ctx.answerCbQuery('Ошибка переключения режима');
  }
}

export async function handleDonkiSetMode(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    // Переключаем режим из главного меню
    ctx.session.donkiSimpleMode = !(ctx.session.donkiSimpleMode ?? false);
    const isSimpleMode = ctx.session.donkiSimpleMode;
    const modeText = isSimpleMode ? '💬 Простой режим' : '📊 Подробный режим';

    const message = `
🌌 <b>DONKI - Космическая погода</b>

${modeText} (можно переключить после выбора события)

Выберите тип события космической погоды для просмотра:

• <b>CME</b> - Корональные выбросы массы
• <b>Вспышки</b> - Солнечные вспышки
• <b>SEP</b> - Солнечные энергичные частицы
• <b>Геобури</b> - Геомагнитные бури
• <b>IPS</b> - Межпланетные удары
• <b>Уведомления</b> - Последние уведомления
• <b>WSA-ENLIL</b> - Симуляции моделирования

<i>Все данные из базы DONKI NASA</i>
    `.trim();

    const menu = createDonkiMainMenu();
    menu.inline_keyboard.push([
      {
        text: isSimpleMode ? '📊 Переключить на подробный' : '💬 Переключить на простой',
        callback_data: 'donki_set_mode',
      },
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });

    await ctx.answerCbQuery(`Режим изменен на: ${modeText}`);
  } catch (error) {
    console.error('DONKI Set Mode Error:', error);
    await ctx.answerCbQuery('Ошибка изменения режима');
  }
}
