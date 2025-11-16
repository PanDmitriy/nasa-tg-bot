import express from 'express';
import { prisma } from '../shared/db/prisma';
import { logger } from '../shared/logger';
import { WebPayService } from '../features/payments/webpay.service';

const router = express.Router();

// Инициализация WebPay сервиса для проверки подписей
let webpayService: WebPayService | null = null;

function getWebPayService(): WebPayService {
  if (!webpayService) {
    webpayService = new WebPayService();
  }
  return webpayService;
}

/**
 * Webhook handler для WebPay событий
 * Обрабатывает уведомления о статусе платежей
 */
export function createWebPayWebhookHandler() {
  const webhookSecret = process.env.WEBPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('WEBPAY_WEBHOOK_SECRET is not set. Webhook signature verification будет отключена.');
  }

  router.post(
    '/webhook',
    express.urlencoded({ extended: true }),
    express.json(),
    async (req: express.Request, res: express.Response) => {
      try {
        const webpay = getWebPayService();
        const data = req.body;

        // Проверяем подпись webhook (если используется)
        const signature = req.headers['x-webpay-signature'] as string;
        if (webhookSecret && signature) {
          const isValid = webpay.verifyWebhookSignature(data, signature);
          if (!isValid) {
            logger.error('Invalid webhook signature', undefined, { data });
            res.status(400).send('Invalid signature');
            return;
          }
        } else if (webhookSecret && !signature) {
          logger.warn('Webhook signature verification is enabled but signature header is missing');
        }

        // Обрабатываем событие в зависимости от статуса платежа
        const paymentStatus = data.status || data.payment_status;
        const orderId = data.order_id || data.order_num;

        if (!orderId) {
          logger.error('Missing order_id in webhook data', undefined, { data });
          res.status(400).send('Missing order_id');
          return;
        }

        logger.info('WebPay webhook received', { orderId, status: paymentStatus });

        // Обрабатываем успешный платеж
        if (paymentStatus === 'success' || paymentStatus === 'approved' || paymentStatus === '5') {
          await handlePaymentSuccess(data, orderId);
        } else if (paymentStatus === 'failed' || paymentStatus === 'declined' || paymentStatus === '3') {
          await handlePaymentFailed(data, orderId);
        } else if (paymentStatus === 'canceled' || paymentStatus === 'cancelled' || paymentStatus === '2') {
          await handlePaymentCancelled(data, orderId);
        }

        // WebPay ожидает ответ 200 OK
        res.status(200).send('OK');
      } catch (error) {
        logger.error('Error processing webhook event', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  return router;
}

/**
 * Обрабатывает успешный платеж
 * Активирует Premium подписку для пользователя
 */
async function handlePaymentSuccess(data: any, orderId: string) {
  // Извлекаем telegramId из orderId или из кастомных полей
  let telegramId: string | null = null;

  // Пытаемся извлечь telegramId из orderId (формат: premium_{telegramId}_{timestamp})
  const orderIdMatch = orderId.match(/^premium_(\d+)_\d+$/);
  if (orderIdMatch) {
    telegramId = orderIdMatch[1];
  }

  // Или из кастомного поля
  if (!telegramId && data.wsb_custom_telegram_id) {
    telegramId = data.wsb_custom_telegram_id;
  }

  if (!telegramId) {
    logger.error('Missing telegramId in payment data', undefined, { orderId, data });
    return;
  }

  // Вычисляем дату окончания подписки (1 месяц с текущей даты)
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

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
    logger.info('Premium updated', { telegramId, orderId, until: currentPeriodEnd });
  } else {
    // Создаем новую запись
    await prisma.premium.create({
      data: {
        telegramId,
        active: true,
        until: currentPeriodEnd,
      },
    });
    logger.info('Premium activated', { telegramId, orderId, until: currentPeriodEnd });
  }
}

/**
 * Обрабатывает неудачный платеж
 */
async function handlePaymentFailed(data: any, orderId: string) {
  logger.info('Payment failed', { orderId, data });
  // Можно добавить логику для уведомления пользователя или логирования
}

/**
 * Обрабатывает отмененный платеж
 */
async function handlePaymentCancelled(data: any, orderId: string) {
  logger.info('Payment cancelled', { orderId, data });
  // Можно добавить логику для обработки отмены
}
