import { Context, Markup } from 'telegraf';
import { BotContext } from '../../types';
import { container } from '../../../../shared/di/container';
import { SubscriptionType } from '../../../../features/subscriptions/subscription.service';
import { getCallbackQueryData } from '../../../../shared/lib/telegramHelpers';
import { logger } from '../../../../shared/logger';
import { validateHourUtc } from '../../../../shared/lib/validators';

interface SubscribeSession {
  step?: 'type' | 'time' | 'confirm';
  type?: SubscriptionType;
  hourUtc?: number;
}

/**
 * Генерирует визуальный индикатор прогресса
 */
function getProgressIndicator(step: number, total: number): string {
  const filled = '🟩'.repeat(step);
  const empty = '⬜'.repeat(total - step);
  return `${filled}${empty} ${step}/${total}`;
}

/**
 * Главный handler для команды /subscribe
 */
export async function handleSubscribe(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  // Инициализируем сессию подписки
  if (!ctx.session) {
    ctx.session = {};
  }
  ctx.session.subscribe = {
    step: 'type',
  } as SubscribeSession;

  const progress = getProgressIndicator(1, 3);
  const message = `📅 <b>Подписка на Daily APOD</b>\n` +
    `${progress}\n\n` +
    `Выберите тип подписки:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🌌 APOD', 'subscribe_type_apod')],
    [Markup.button.callback('🌍 Earth', 'subscribe_type_earth')],
    [Markup.button.callback('🌊 DONKI', 'subscribe_type_donki')],
    [Markup.button.callback('❌ Отмена', 'subscribe_cancel')],
  ]);

  await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
}

/**
 * Обработчик выбора типа подписки
 */
export async function handleSubscribeType(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  try {
    await ctx.answerCbQuery();
  } catch {}

  const data = getCallbackQueryData(ctx);
  if (!data) {
    await ctx.reply('❌ Ошибка: не удалось получить данные.');
    return;
  }
  const type = data.replace('subscribe_type_', '') as SubscriptionType;

  if (!ctx.session) {
    ctx.session = {};
  }
  if (!ctx.session.subscribe) {
    ctx.session.subscribe = {};
  }

  ctx.session.subscribe.step = 'time';
  ctx.session.subscribe.type = type;

  const typeNames: Record<SubscriptionType, string> = {
    apod: '🌌 APOD (Astronomy Picture of the Day)',
    earth: '🌍 Earth (Снимки Земли)',
    donki: '🌊 DONKI (Космическая погода)',
  };

  const progress = getProgressIndicator(2, 3);
  const message = `📅 <b>Подписка: ${typeNames[type]}</b>\n` +
    `${progress}\n\n` +
    `Выберите время доставки (UTC):\n` +
    `Или введите час вручную (0-23)`;

  // Создаем клавиатуру с часами (группируем по 4 часа в ряд)
  const hourButtons: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < 24; i += 4) {
    const row: ReturnType<typeof Markup.button.callback>[] = [];
    for (let j = 0; j < 4 && i + j < 24; j++) {
      const hour = i + j;
      row.push(Markup.button.callback(`${hour}`, `subscribe_time_${hour}`));
    }
    hourButtons.push(row);
  }
  hourButtons.push([Markup.button.callback('❌ Отмена', 'subscribe_cancel')]);

  const keyboard = Markup.inlineKeyboard(hourButtons);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

/**
 * Обработчик выбора времени
 */
export async function handleSubscribeTime(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  try {
    await ctx.answerCbQuery();
  } catch {}

  const data = getCallbackQueryData(ctx);
  if (!data) {
    await ctx.reply('❌ Ошибка: не удалось получить данные.');
    return;
  }
  const hourUtc = parseInt(data.replace('subscribe_time_', ''), 10);

  const validation = validateHourUtc(hourUtc);
  if (!validation.valid) {
    await ctx.reply(`❌ ${validation.error}`);
    return;
  }

  if (!ctx.session || !ctx.session.subscribe || !ctx.session.subscribe.type) {
    await ctx.reply('❌ Сессия истекла. Начните заново с /subscribe');
    return;
  }

  ctx.session.subscribe.step = 'confirm';
  ctx.session.subscribe.hourUtc = hourUtc;

  const type = ctx.session.subscribe.type;
  const typeNames: Record<SubscriptionType, string> = {
    apod: '🌌 APOD',
    earth: '🌍 Earth',
    donki: '🌊 DONKI',
  };

  const progress = getProgressIndicator(3, 3);
  const message = `📅 <b>Подтверждение подписки</b>\n` +
    `${progress}\n\n` +
    `Тип: ${typeNames[type]}\n` +
    `Время доставки: ${hourUtc}:00 UTC\n\n` +
    `Подтвердите создание подписки:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Подтвердить', 'subscribe_confirm')],
    [Markup.button.callback('❌ Отмена', 'subscribe_cancel')],
  ]);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }
}

/**
 * Обработчик подтверждения подписки
 */
export async function handleSubscribeConfirm(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  try {
    await ctx.answerCbQuery();
  } catch {}

  if (!ctx.session || !ctx.session.subscribe) {
    await ctx.reply('❌ Сессия истекла. Начните заново с /subscribe');
    return;
  }

  const { type, hourUtc } = ctx.session.subscribe;

  if (!type || hourUtc === undefined) {
    await ctx.reply('❌ Недостаточно данных. Начните заново с /subscribe');
    return;
  }

  try {
    const telegramId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();

    await container.subscriptionService.create({
      telegramId,
      chatId,
      type,
      hourUtc,
    });

    const typeNames: Record<SubscriptionType, string> = {
      apod: '🌌 APOD',
      earth: '🌍 Earth',
      donki: '🌊 DONKI',
    };

    const message = `✅ <b>Подписка создана!</b>\n\n` +
      `Тип: ${typeNames[type]}\n` +
      `Время доставки: ${hourUtc}:00 UTC\n\n` +
      `Вы будете получать ежедневные уведомления в указанное время.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Закрыть', 'subscribe_close')],
    ]);

    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
    } catch {
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    }

    // Очищаем сессию
    delete ctx.session.subscribe;
  } catch (error) {
    logger.error('Subscribe Error', error);
    await ctx.reply('❌ Произошла ошибка при создании подписки. Попробуйте позже.');
  }
}

/**
 * Обработчик отмены подписки
 */
export async function handleSubscribeCancel(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery();
  } catch {}

  if (ctx.session && ctx.session.subscribe) {
    delete ctx.session.subscribe;
  }

  try {
    await ctx.deleteMessage();
  } catch {
    await ctx.reply('❌ Подписка отменена.');
  }
}

/**
 * Обработчик закрытия сообщения
 */
export async function handleSubscribeClose(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery();
  } catch {}

  try {
    await ctx.deleteMessage();
  } catch {}
}

/**
 * Обработчик ввода времени вручную (текстовое сообщение)
 * Обрабатывает только текстовые сообщения, когда пользователь находится в режиме выбора времени
 */
export async function handleSubscribeTimeInput(ctx: Context & BotContext) {
  // Проверяем, что это текстовое сообщение
  if (!ctx.chat || !ctx.from || !ctx.message || !('text' in ctx.message)) {
    return;
  }

  // Проверяем, что пользователь находится в режиме выбора времени для подписки
  if (!ctx.session || !ctx.session.subscribe || ctx.session.subscribe.step !== 'time') {
    return; // Игнорируем, если не в режиме выбора времени
  }

  // Проверяем, что это не команда (команды начинаются с /)
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) {
    return; // Команды обрабатываются отдельно
  }

  const hourUtc = parseInt(text, 10);

  const validation = validateHourUtc(hourUtc);
  if (!validation.valid) {
    await ctx.reply(`❌ ${validation.error}`);
    return;
  }

  // Обновляем сессию и вызываем обработчик времени
  if (ctx.session.subscribe) {
    ctx.session.subscribe.hourUtc = hourUtc;
    ctx.session.subscribe.step = 'confirm';
  }

  const type = ctx.session.subscribe?.type;
  if (!type) {
    await ctx.reply('❌ Сессия истекла. Начните заново с /subscribe');
    return;
  }

  const typeNames: Record<SubscriptionType, string> = {
    apod: '🌌 APOD',
    earth: '🌍 Earth',
    donki: '🌊 DONKI',
  };

  const progress = getProgressIndicator(3, 3);
  const message = `📅 <b>Подтверждение подписки</b>\n` +
    `${progress}\n\n` +
    `Тип: ${typeNames[type]}\n` +
    `Время доставки: ${hourUtc}:00 UTC\n\n` +
    `Подтвердите создание подписки:`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Подтвердить', 'subscribe_confirm')],
    [Markup.button.callback('❌ Отмена', 'subscribe_cancel')],
  ]);

  await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
}

