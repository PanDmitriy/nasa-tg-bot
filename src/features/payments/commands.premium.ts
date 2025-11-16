import { Context, Markup } from 'telegraf';
import { BotContext } from '../../processes/bot/types';
import { WebPayService } from './webpay.service';
import { prisma } from '../../shared/db/prisma';
import { logger } from '../../shared/logger';

// Ленивая инициализация WebPayService
let webpayService: WebPayService | null = null;

function getWebPayService(): WebPayService {
  if (!webpayService) {
    if (!process.env.WEBPAY_STORE_ID || !process.env.WEBPAY_SECRET_KEY) {
      throw new Error('WEBPAY_STORE_ID or WEBPAY_SECRET_KEY is not set in environment variables. Premium features are disabled.');
    }
    webpayService = new WebPayService();
  }
  return webpayService;
}

/**
 * Handler для команды /premium
 * Показывает преимущества Premium и кнопку для оплаты
 */
export async function handlePremium(ctx: Context & BotContext) {
  if (!ctx.chat || !ctx.from) {
    return;
  }

  const telegramId = ctx.from.id.toString();

  try {
    // Проверяем, есть ли у пользователя активная Premium подписка
    const premium = await prisma.premium.findFirst({
      where: {
        telegramId,
        active: true,
        until: {
          gte: new Date(),
        },
      },
    });

    if (premium) {
      const untilDate = new Date(premium.until).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const message =
        `⭐ <b>У вас активна Premium подписка!</b>\n\n` +
        `📅 Действует до: ${untilDate}\n\n` +
        `✨ Преимущества Premium:\n` +
        `• Приоритетная поддержка\n` +
        `• Расширенные возможности бота\n` +
        `• Эксклюзивный контент\n` +
        `• Без рекламы`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      return;
    }

    // Создаем Checkout Session
    const webpay = getWebPayService();
    const session = await webpay.createCheckoutSession({ telegramId });

    // Получаем цену из переменных окружения или используем значение по умолчанию
    const priceByn = parseInt(process.env.PREMIUM_PRICE_BYN || '3000', 10) / 100; // Конвертируем копейки в рубли

    const message =
      `⭐ <b>NASA Bot Premium</b>\n\n` +
      `✨ <b>Преимущества Premium подписки:</b>\n\n` +
      `• 🚀 Приоритетная поддержка\n` +
      `• 📊 Расширенная статистика\n` +
      `• 🎨 Эксклюзивные функции\n` +
      `• ⚡ Быстрый доступ ко всем командам\n` +
      `• 🚫 Без рекламы\n\n` +
      `💰 Стоимость: ${priceByn.toFixed(2)} BYN/месяц\n\n` +
      `Нажмите кнопку ниже, чтобы оформить подписку:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('💳 Оплатить', session.url || '')],
      [Markup.button.callback('❌ Закрыть', 'premium_close')],
    ]);

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    logger.error('Premium Error', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await ctx.reply(
      `❌ Произошла ошибка при создании платежной сессии. Попробуйте позже.\n\nОшибка: ${errorMessage}`
    );
  }
}

/**
 * Обработчик закрытия меню Premium
 */
export async function handlePremiumClose(ctx: Context & BotContext) {
  try {
    await ctx.answerCbQuery();
  } catch {}

  try {
    await ctx.deleteMessage();
  } catch {
    await ctx.reply('Меню закрыто.');
  }
}

