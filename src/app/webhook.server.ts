import express from 'express';
import { createWebPayWebhookHandler } from './payments.webhook';
import { logger } from '../shared/logger';

/**
 * Запускает HTTP сервер для обработки WebPay webhooks
 */
export function startWebhookServer(port: number = 3000) {
  const app = express();

  // WebPay webhook handler
  app.use('/api/payments', createWebPayWebhookHandler());

  // Middleware для парсинга JSON (для других endpoints)
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'webpay-webhook' });
  });

  // Success page
  app.get('/payment/success', (req, res) => {
    const orderId = req.query.order_id;
    const telegramId = req.query.telegram_id;
    res.send(`
      <html>
        <head><title>Payment Success</title></head>
        <body>
          <h1>✅ Payment Successful!</h1>
          <p>Your Premium subscription has been activated.</p>
          <p>Order ID: ${orderId}</p>
          <p>Telegram ID: ${telegramId}</p>
          <p>You can close this window and return to Telegram.</p>
        </body>
      </html>
    `);
  });

  // Cancel page
  app.get('/payment/cancel', (req, res) => {
    const telegramId = req.query.telegram_id;
    res.send(`
      <html>
        <head><title>Payment Cancelled</title></head>
        <body>
          <h1>❌ Payment Cancelled</h1>
          <p>Your payment was cancelled.</p>
          <p>Telegram ID: ${telegramId}</p>
          <p>You can close this window and return to Telegram.</p>
        </body>
      </html>
    `);
  });

  const server = app.listen(port, () => {
    logger.info('Webhook server started', { port });
    logger.info('Webhook endpoint available', {
      endpoint: `http://localhost:${port}/api/payments/webhook`,
    });
  });

  return server;
}

