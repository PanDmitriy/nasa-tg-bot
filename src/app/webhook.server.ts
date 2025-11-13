import express from 'express';
import { createStripeWebhookHandler } from './payments.webhook';

/**
 * Запускает HTTP сервер для обработки Stripe webhooks
 */
export function startWebhookServer(port: number = 3000) {
  const app = express();

  // Stripe webhook handler (должен быть до express.json для raw body)
  app.use('/api/payments', createStripeWebhookHandler());

  // Middleware для парсинга JSON (для других endpoints)
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'stripe-webhook' });
  });

  // Success page
  app.get('/payment/success', (req, res) => {
    const sessionId = req.query.session_id;
    const telegramId = req.query.telegram_id;
    res.send(`
      <html>
        <head><title>Payment Success</title></head>
        <body>
          <h1>✅ Payment Successful!</h1>
          <p>Your Premium subscription has been activated.</p>
          <p>Session ID: ${sessionId}</p>
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
    console.log(`Webhook server started on port ${port}`);
    console.log(`Webhook endpoint: http://localhost:${port}/api/payments/webhook`);
  });

  return server;
}

