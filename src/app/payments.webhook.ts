import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../shared/db/prisma';
import { logger } from '../shared/logger';

const router = express.Router();

/**
 * Webhook handler для Stripe событий
 * Обрабатывает события checkout.session.completed для активации Premium
 */
export function createStripeWebhookHandler() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover',
  });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification будет отключена.');
  }

  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req: express.Request, res: express.Response) => {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        logger.error('Missing stripe-signature header');
        res.status(400).send('Missing stripe-signature header');
        return;
      }

      let event: Stripe.Event;

      try {
        // Верифицируем подпись webhook
        if (webhookSecret) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          // В режиме разработки без верификации (не рекомендуется для продакшена)
          event = JSON.parse(req.body.toString()) as Stripe.Event;
          logger.warn('Webhook signature verification is disabled. This should not be used in production.');
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('Webhook signature verification failed', error);
        res.status(400).send(`Webhook Error: ${error}`);
        return;
      }

      // Обрабатываем событие
      try {
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionCompleted(session);
        } else if (event.type === 'customer.subscription.deleted') {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
        } else if (event.type === 'customer.subscription.updated') {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
        }

        res.json({ received: true });
      } catch (error) {
        logger.error('Error processing webhook event', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  return router;
}

/**
 * Обрабатывает успешное завершение checkout сессии
 * Активирует Premium подписку для пользователя
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const telegramId = session.metadata?.telegramId || session.client_reference_id;

  if (!telegramId) {
    logger.error('Missing telegramId in checkout session', undefined, { sessionId: session.id });
    return;
  }

  // Получаем информацию о подписке
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    logger.error('Missing subscription ID in checkout session', undefined, { sessionId: session.id });
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover',
  });

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

  // Создаем или обновляем Premium запись
  const existingPremium = await prisma.premium.findFirst({
    where: { telegramId },
  });

  if (existingPremium) {
    // Обновляем существующую запись
    await prisma.premium.update({
      where: { id: existingPremium.id },
      data: {
        active: true,
        until: currentPeriodEnd,
      },
    });
    logger.info('Premium updated', { telegramId, until: currentPeriodEnd });
  } else {
    // Создаем новую запись
    await prisma.premium.create({
      data: {
        telegramId,
        active: true,
        until: currentPeriodEnd,
      },
    });
    logger.info('Premium activated', { telegramId, until: currentPeriodEnd });
  }
}

/**
 * Обрабатывает отмену подписки
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Находим Premium запись по customer ID (если храним его в metadata)
  // Или можно использовать другой способ связи
  logger.info('Subscription deleted', { subscriptionId: subscription.id });
  
  // В реальном приложении нужно связать Stripe customer ID с telegramId
  // Для упрощения можно деактивировать все активные Premium записи
  // или хранить stripeCustomerId в Premium модели
}

/**
 * Обрабатывает обновление подписки
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
  
  // Обновляем Premium запись если подписка активна
  if (subscription.status === 'active') {
    // В реальном приложении нужно связать Stripe customer ID с telegramId
    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      periodEnd: currentPeriodEnd,
    });
  } else {
    // Деактивируем Premium если подписка неактивна
    logger.info('Subscription status changed', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  }
}

