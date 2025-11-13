import { Context, Markup } from 'telegraf';
import { BotContext } from '../../processes/bot/types';
import { SubscriptionService } from './subscription.service';
import { getCallbackQueryData } from '../../shared/lib/telegramHelpers';

const subscriptionService = new SubscriptionService();

/**
 * Главный handler для команды /unsubscribe
 * Показывает список активных подписок пользователя
 */
export async function handleUnsubscribe(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  const chatId = ctx.chat.id.toString();

  try {
    // Получаем все подписки пользователя (включая отключенные)
    const subscriptions = await subscriptionService.getByChat(chatId);

    if (subscriptions.length === 0) {
      await ctx.reply('❌ У вас нет активных подписок.');
      return;
    }

    // Фильтруем только активные подписки
    const activeSubscriptions = subscriptions.filter((sub) => sub.enabled);

    if (activeSubscriptions.length === 0) {
      await ctx.reply('❌ У вас нет активных подписок. Все подписки уже отключены.');
      return;
    }

    const typeNames: Record<string, string> = {
      apod: '🌌 APOD',
      earth: '🌍 Earth',
      donki: '🌊 DONKI',
    };

    // Формируем сообщение со списком подписок
    let message = `📋 <b>Ваши активные подписки:</b>\n\n`;

    // Создаем кнопки для каждой подписки
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    for (const sub of activeSubscriptions) {
      const typeName = typeNames[sub.type] || sub.type;
      const paramsInfo = sub.params
        ? ` (${JSON.stringify(sub.params).substring(0, 30)}...)`
        : '';
      const subInfo = `${typeName} - ${sub.hourUtc}:00 UTC${paramsInfo}`;
      message += `• ${subInfo}\n`;

      buttons.push([
        Markup.button.callback(
          `❌ ${typeName} (${sub.hourUtc}:00 UTC)`,
          `unsubscribe_${sub.id}`
        ),
      ]);
    }

    buttons.push([Markup.button.callback('❌ Закрыть', 'unsubscribe_close')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    console.error('Unsubscribe Error:', error);
    await ctx.reply('❌ Произошла ошибка при получении списка подписок. Попробуйте позже.');
  }
}

/**
 * Обработчик отключения конкретной подписки
 */
export async function handleUnsubscribeItem(ctx: Context & BotContext) {
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

  const subscriptionId = parseInt(data.replace('unsubscribe_', ''), 10);

  if (isNaN(subscriptionId)) {
    await ctx.reply('❌ Ошибка: неверный ID подписки.');
    return;
  }

  const chatId = ctx.chat.id.toString();

  try {
    // Отключаем подписку
    await subscriptionService.disable(subscriptionId, chatId);

    // Получаем информацию о подписке для сообщения
    const subscription = await subscriptionService.getById(subscriptionId);

    if (!subscription) {
      await ctx.reply('❌ Подписка не найдена.');
      return;
    }

    const typeNames: Record<string, string> = {
      apod: '🌌 APOD',
      earth: '🌍 Earth',
      donki: '🌊 DONKI',
    };

    const typeName = typeNames[subscription.type] || subscription.type;

    // Обновляем сообщение
    const message = `✅ <b>Подписка отключена</b>\n\n` +
      `Тип: ${typeName}\n` +
      `Время доставки: ${subscription.hourUtc}:00 UTC\n\n` +
      `Вы больше не будете получать уведомления по этой подписке.`;

    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('Unsubscribe Item Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await ctx.reply(`❌ Ошибка при отключении подписки: ${errorMessage}`);
  }
}

/**
 * Обработчик закрытия меню
 */
export async function handleUnsubscribeClose(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery();
  } catch {}

  try {
    await ctx.deleteMessage();
  } catch {
    await ctx.reply('Меню закрыто.');
  }
}

