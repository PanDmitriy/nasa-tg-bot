import { Context } from 'telegraf';
import { BotContext, CMEAlertLevel } from '../types';
import { DonkiCME, DonkiFlare, DonkiSEP, DonkiGST, DonkiIPS, DonkiNotification, DonkiWSAEnlil } from '../../../features/donki/api';
import { container } from '../../../shared/di/container';
import { logger } from '../../../shared/logger';
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
import { subscriptionsRepository } from '../../../shared/db/repositories/subscriptions';

type DonkiEventType = 'cme' | 'flares' | 'sep' | 'gst' | 'ips' | 'notifications' | 'wsaenlil';
type DonkiEvent = DonkiCME | DonkiFlare | DonkiSEP | DonkiGST | DonkiIPS | DonkiNotification | DonkiWSAEnlil;

async function createDonkiMainMenu(userId?: number): Promise<InlineKeyboardMarkup> {
  let hasAnySubscription = false;
  if (userId) {
    const subscriptions = await subscriptionsRepository.getUserSubscriptions(userId);
    hasAnySubscription = subscriptions.length > 0;
  }

  const menu: InlineKeyboardMarkup = {
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
        { text: hasAnySubscription ? '🔔 Управление подписками' : '🔔 Подписки', callback_data: 'donki_subscriptions' },
      ],
      [
        { text: '❌ Закрыть', callback_data: 'donki_close' },
        { text: '🏠 Главное меню', callback_data: 'main_menu' },
      ],
    ],
  };
  return menu;
}

async function createSubscriptionsMenu(userId: number): Promise<InlineKeyboardMarkup> {
  const cmeSub = await subscriptionsRepository.getSubscription(userId, 'cme');
  const notificationsSub = await subscriptionsRepository.getSubscription(userId, 'notifications');
  const wsaenlilSub = await subscriptionsRepository.getSubscription(userId, 'wsaenlil');

  const cmeStatus = cmeSub 
    ? `✅ Подписан (${cmeSub.alertLevel === 'extreme' ? 'Экстремальные' : cmeSub.alertLevel === 'high' ? 'Высокие' : 'Все'})`
    : '❌ Не подписан';
  
  const notificationsStatus = notificationsSub ? '✅ Подписан' : '❌ Не подписан';
  const wsaenlilStatus = wsaenlilSub ? '✅ Подписан' : '❌ Не подписан';
  
  return {
    inline_keyboard: [
      [
        { text: `🌊 CME: ${cmeStatus}`, callback_data: 'donki_sub_cme_menu' },
      ],
      [
        { text: `📢 Уведомления: ${notificationsStatus}`, callback_data: 'donki_sub_notifications_toggle' },
      ],
      [
        { text: `🌐 WSA-ENLIL: ${wsaenlilStatus}`, callback_data: 'donki_sub_wsaenlil_toggle' },
      ],
      [
        { text: '🔙 Назад', callback_data: 'donki_menu' },
      ],
    ],
  };
}

function createCMESubscriptionMenu(currentLevel?: CMEAlertLevel): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { 
          text: currentLevel === 'extreme' ? '✅ Экстремальные (≥1000 км/с)' : '🔴 Экстремальные (≥1000 км/с)', 
          callback_data: 'donki_sub_cme_extreme' 
        },
      ],
      [
        { 
          text: currentLevel === 'high' ? '✅ Высокие (≥700 км/с)' : '🟠 Высокие (≥700 км/с)', 
          callback_data: 'donki_sub_cme_high' 
        },
      ],
      [
        { 
          text: currentLevel === 'all' ? '✅ Все события CME' : '📋 Все события CME', 
          callback_data: 'donki_sub_cme_all' 
        },
      ],
      [
        { 
          text: '❌ Отписаться', 
          callback_data: 'donki_sub_cme_none' 
        },
      ],
      [
        { text: '🔙 Назад', callback_data: 'donki_subscriptions' },
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

function getEventDate(item: DonkiEvent, type: DonkiEventType): Date {
  switch (type) {
    case 'cme':
      return new Date((item as DonkiCME).startTime);
    case 'flares':
      const flare = item as DonkiFlare;
      return new Date(flare.peakTime || flare.beginTime);
    case 'sep':
      return new Date((item as DonkiSEP).eventTime);
    case 'gst':
      return new Date((item as DonkiGST).startTime);
    case 'ips':
      return new Date((item as DonkiIPS).eventTime);
    case 'notifications':
      return new Date((item as DonkiNotification).messageIssueTime);
    case 'wsaenlil':
      return new Date((item as DonkiWSAEnlil).modelCompletionTime);
    default:
      return new Date(0);
  }
}

function sortEventsByDateDesc(items: DonkiEvent[], type: DonkiEventType): DonkiEvent[] {
  return [...items].sort((a, b) => {
    const dateA = getEventDate(a, type);
    const dateB = getEventDate(b, type);
    return dateB.getTime() - dateA.getTime(); // Сортировка по убыванию (новые сначала)
  });
}

function createKeyboardWithModeToggle(
  items: DonkiEvent[],
  type: DonkiEventType,
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
  ]);
  keyboard.inline_keyboard.push([
    { text: '🔙 Назад к меню', callback_data: 'donki_menu' },
    { text: '🏠 Главное меню', callback_data: 'main_menu' },
  ]);

  return keyboard;
}

function formatDonkiItem(
  item: DonkiEvent,
  type: DonkiEventType,
  isSimpleMode: boolean
): string {
  if (isSimpleMode) {
    switch (type) {
      case 'cme':
        return formatCMESimple(item as DonkiCME);
      case 'flares':
        return formatFlareSimple(item as DonkiFlare);
      case 'sep':
        return formatSEPSimple(item as DonkiSEP);
      case 'gst':
        return formatGSTSimple(item as DonkiGST);
      case 'ips':
        return formatIPSSimple(item as DonkiIPS);
      case 'notifications':
        return formatNotificationSimple(item as DonkiNotification);
      case 'wsaenlil':
        return formatWSAEnlilSimple(item as DonkiWSAEnlil);
      default:
        return '';
    }
  } else {
    switch (type) {
      case 'cme':
        return formatCME(item as DonkiCME);
      case 'flares':
        return formatFlare(item as DonkiFlare);
      case 'sep':
        return formatSEP(item as DonkiSEP);
      case 'gst':
        return formatGST(item as DonkiGST);
      case 'ips':
        return formatIPS(item as DonkiIPS);
      case 'notifications':
        return formatNotification(item as DonkiNotification);
      case 'wsaenlil':
        return formatWSAEnlil(item as DonkiWSAEnlil);
      default:
        return '';
    }
  }
}

export async function handleDonki(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    const userId = ctx.from?.id;
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

    const menu = await createDonkiMainMenu(userId);
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
    logger.error('DONKI Error', error, { handler: 'handleDonki' });
    await ctx.reply('❌ Произошла ошибка при загрузке меню DONKI.');
  }
}

export async function handleDonkiMenu(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    const userId = ctx.from?.id;
    const isSimpleMode = ctx.session.donkiSimpleMode ?? false;
    const modeText = isSimpleMode ? '💬 Простой режим' : '📊 Подробный режим';
    
    const message = `
🌌 <b>DONKI - Космическая погода</b>

${modeText} (можно переключить после выбора события)

Выберите тип события:
    `.trim();

    const menu = await createDonkiMainMenu(userId);
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
    logger.error('DONKI Menu Error', error, { handler: 'handleDonkiMenu' });
  }
}

export async function handleDonkiCME(ctx: Context & BotContext) {
  try {
    await ctx.editMessageText('📅 Выберите период для CME:', {
      reply_markup: createDateMenu('cme'),
    });
  } catch (error) {
    logger.error('DONKI CME Error', error, { handler: 'handleDonkiCME' });
  }
}

export async function handleDonkiCMEData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка CME...');
    const { startDate, endDate } = getDateRange(days);
    const cmes = sortEventsByDateDesc(await container.donkiApi.getCMEs(startDate, endDate), 'cme');

    if (cmes.length === 0) {
      const message = `🌊 <b>Нет событий CME</b>\n\n` +
        `За выбранный период не было зарегистрировано корональных выбросов массы.\n\n` +
        `☀️ <b>Это хорошая новость!</b> Космическая погода спокойная, и это означает стабильные условия для спутников и космических миссий.\n\n` +
        `💡 <b>Попробуйте:</b>\n` +
        `• Выбрать другой период (неделя, месяц)\n` +
        `• Посмотреть другие типы событий (вспышки, геобури)\n` +
        `• Подписаться на уведомления о новых событиях`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📅 Другой период', callback_data: 'donki_cme' },
            { text: '☀️ Вспышки', callback_data: 'donki_flares' }
          ],
          [
            { text: '🌍 Геобури', callback_data: 'donki_gst' },
            { text: '🔔 Подписки', callback_data: 'donki_subscriptions' }
          ],
          [
            { text: '🔙 Назад', callback_data: 'donki_menu' },
            { text: '🏠 Главное меню', callback_data: 'main_menu' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
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
    logger.error('DONKI CME Data Error', error, { handler: 'handleDonkiCMEData', days });
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
    logger.error('DONKI Flares Error', error, { handler: 'handleDonkiFlares' });
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
    logger.error('DONKI Flares Period Error', error, { handler: 'handleDonkiFlaresPeriod' });
  }
}

export async function handleDonkiFlaresData(ctx: Context & BotContext, classType: string = 'ALL', days?: number) {
  if (!ctx.session) ctx.session = {};
  const period = days || ctx.session.donkiFlaresPeriod || 7;
  try {
    await ctx.answerCbQuery('Загрузка вспышек...');
    const { startDate, endDate } = getDateRange(period);
    const flares = sortEventsByDateDesc(await container.donkiApi.getFlares(startDate, endDate, 'M2M_CATALOG', classType), 'flares');

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
    logger.error('DONKI Flares Data Error', error, { handler: 'handleDonkiFlaresData', classType, period });
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
    logger.error('DONKI SEP Error', error, { handler: 'handleDonkiSEP' });
  }
}

export async function handleDonkiSEPData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка SEP...');
    const { startDate, endDate } = getDateRange(days);
    const seps = sortEventsByDateDesc(await container.donkiApi.getSEPs(startDate, endDate), 'sep');

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
    logger.error('DONKI SEP Data Error', error, { handler: 'handleDonkiSEPData', days });
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
    logger.error('DONKI GST Error', error, { handler: 'handleDonkiGST' });
  }
}

export async function handleDonkiGSTData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка геобурь...');
    const { startDate, endDate } = getDateRange(days);
    const gsts = sortEventsByDateDesc(await container.donkiApi.getGSTs(startDate, endDate), 'gst');

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
    logger.error('DONKI GST Data Error', error, { handler: 'handleDonkiGSTData', days });
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
    logger.error('DONKI IPS Error', error, { handler: 'handleDonkiIPS' });
  }
}

export async function handleDonkiIPSData(ctx: Context & BotContext, days: number) {
  try {
    if (!ctx.session) ctx.session = {};
    await ctx.answerCbQuery('Загрузка IPS...');
    const { startDate, endDate } = getDateRange(days);
    const ipss = sortEventsByDateDesc(await container.donkiApi.getIPSs(startDate, endDate), 'ips');

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
    logger.error('DONKI IPS Data Error', error, { handler: 'handleDonkiIPSData', days });
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
    const notifications = sortEventsByDateDesc(await container.donkiApi.getNotifications(startDate, endDate), 'notifications');

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
    logger.error('DONKI Notifications Error', error, { handler: 'handleDonkiNotifications' });
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
    const sims = sortEventsByDateDesc(await container.donkiApi.getWSAEnlilSimulations(startDate, endDate), 'wsaenlil');

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
    logger.error('DONKI WSAEnlil Error', error, { handler: 'handleDonkiWSAEnlil' });
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
  } catch (error: unknown) {
    // Обработка ошибки "message is not modified"
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'error_code' in error.response &&
      error.response.error_code === 400 &&
      'description' in error.response &&
      typeof error.response.description === 'string' &&
      error.response.description.includes('message is not modified')
    ) {
      await ctx.answerCbQuery('Вы уже на этом элементе');
      return;
    }
    logger.error('DONKI Navigation Error', error, { handler: 'handleDonkiItemNavigation', data });
    await ctx.answerCbQuery('Ошибка навигации');
  }
}

export async function handleDonkiClose(ctx: Context & BotContext) {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    logger.error('DONKI Close Error', error, { handler: 'handleDonkiClose' });
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
    logger.error('DONKI Toggle Mode Error', error, { handler: 'handleDonkiToggleMode' });
    await ctx.answerCbQuery('Ошибка переключения режима');
  }
}

export async function handleDonkiSetMode(ctx: Context & BotContext) {
  try {
    if (!ctx.session) ctx.session = {};
    const userId = ctx.from?.id;
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

    const menu = await createDonkiMainMenu(userId);
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
    logger.error('DONKI Set Mode Error', error, { handler: 'handleDonkiSetMode' });
    await ctx.answerCbQuery('Ошибка изменения режима');
  }
}

export async function handleDonkiSubscriptions(ctx: Context & BotContext) {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
      return;
    }

    const userId = ctx.from.id;
    
    const message = `
🔔 <b>Управление подписками</b>

Выберите тип события для настройки уведомлений:

<i>Вы будете получать уведомления о новых событиях выбранного типа.</i>
    `.trim();

    const menu = await createSubscriptionsMenu(userId);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });
  } catch (error) {
    logger.error('DONKI Subscriptions Error', error, { handler: 'handleDonkiSubscriptions' });
    await ctx.answerCbQuery('Ошибка загрузки подписок');
  }
}

export async function handleDonkiCMESubscriptionMenu(ctx: Context & BotContext) {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
      return;
    }

    const userId = ctx.from.id;
    const subscription = await subscriptionsRepository.getSubscription(userId, 'cme');
    const currentLevel = subscription ? (subscription.alertLevel as CMEAlertLevel) : undefined;
    
    const message = `
🌊 <b>Подписка на уведомления CME</b>

Выберите уровень событий, на которые хотите подписаться:

• <b>Экстремальные</b> - скорость ≥1000 км/с
• <b>Высокие</b> - скорость ≥700 км/с
• <b>Все события</b> - любые CME события

<i>Вы будете получать уведомления о новых событиях выбранного уровня.</i>
    `.trim();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: createCMESubscriptionMenu(currentLevel),
    });
  } catch (error) {
    logger.error('DONKI CME Subscription Menu Error', error, { handler: 'handleDonkiCMESubscriptionMenu' });
    await ctx.answerCbQuery('Ошибка загрузки меню подписки');
  }
}

export async function handleDonkiCMESubscription(ctx: Context & BotContext, level: CMEAlertLevel | null) {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
      return;
    }

    const userId = ctx.from.id;

    // Сохраняем подписку в БД
    await subscriptionsRepository.setSubscription(userId, 'cme', level);

    if (level === null) {
      // Отписка
      await ctx.answerCbQuery('Вы отписались от уведомлений CME');
    } else {
      // Подписка
      const levelText = level === 'extreme' ? 'экстремальных' : level === 'high' ? 'высоких' : 'всех';
      await ctx.answerCbQuery(`Подписка на ${levelText} CME активирована`);
    }

    // Получаем обновленную подписку из БД
    const subscription = await subscriptionsRepository.getSubscription(userId, 'cme');
    const currentLevel = subscription ? (subscription.alertLevel as CMEAlertLevel) : undefined;

    // Обновляем меню подписки
    const message = `
🌊 <b>Подписка на уведомления CME</b>

Выберите уровень событий, на которые хотите подписаться:

• <b>Экстремальные</b> - скорость ≥1000 км/с
• <b>Высокие</b> - скорость ≥700 км/с
• <b>Все события</b> - любые CME события

<i>Вы будете получать уведомления о новых событиях выбранного уровня.</i>
    `.trim();

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: createCMESubscriptionMenu(currentLevel),
    });
  } catch (error) {
    logger.error('DONKI CME Subscription Error', error, { handler: 'handleDonkiCMESubscription', level });
    await ctx.answerCbQuery('Ошибка изменения подписки');
  }
}

export async function handleDonkiNotificationsSubscription(ctx: Context & BotContext) {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
      return;
    }

    const userId = ctx.from.id;
    const subscription = await subscriptionsRepository.getSubscription(userId, 'notifications');
    const isSubscribed = !!subscription;

    // Переключаем подписку
    if (isSubscribed) {
      await subscriptionsRepository.setSubscription(userId, 'notifications', null);
      await ctx.answerCbQuery('Вы отписались от уведомлений DONKI');
    } else {
      await subscriptionsRepository.setSubscription(userId, 'notifications', 'enabled');
      await ctx.answerCbQuery('Вы подписались на уведомления DONKI');
    }

    // Обновляем меню подписок
    const message = `
🔔 <b>Управление подписками</b>

Выберите тип события для настройки уведомлений:

<i>Вы будете получать уведомления о новых событиях выбранного типа.</i>
    `.trim();

    const menu = await createSubscriptionsMenu(userId);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });
  } catch (error) {
    logger.error('DONKI Notifications Subscription Error', error, { handler: 'handleDonkiNotificationsSubscription' });
    await ctx.answerCbQuery('Ошибка изменения подписки');
  }
}

export async function handleDonkiWSAEnlilSubscription(ctx: Context & BotContext) {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery('Ошибка: не удалось определить пользователя');
      return;
    }

    const userId = ctx.from.id;
    const subscription = await subscriptionsRepository.getSubscription(userId, 'wsaenlil');
    const isSubscribed = !!subscription;

    // Переключаем подписку
    if (isSubscribed) {
      await subscriptionsRepository.setSubscription(userId, 'wsaenlil', null);
      await ctx.answerCbQuery('Вы отписались от симуляций WSA-ENLIL');
    } else {
      await subscriptionsRepository.setSubscription(userId, 'wsaenlil', 'enabled');
      await ctx.answerCbQuery('Вы подписались на симуляции WSA-ENLIL');
    }

    // Обновляем меню подписок
    const message = `
🔔 <b>Управление подписками</b>

Выберите тип события для настройки уведомлений:

<i>Вы будете получать уведомления о новых событиях выбранного типа.</i>
    `.trim();

    const menu = await createSubscriptionsMenu(userId);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: menu,
    });
  } catch (error) {
    logger.error('DONKI WSAEnlil Subscription Error', error, { handler: 'handleDonkiWSAEnlilSubscription' });
    await ctx.answerCbQuery('Ошибка изменения подписки');
  }
}
