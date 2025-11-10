import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { initSentry, setupGlobalErrorHandlers } from '../shared/logger/sentry';
import { Bot } from '../processes/bot';
import { DonkiNotificationsService } from '../processes/notifications/donki-notifications';
import { SubscriptionScheduler } from '../processes/schedulers/subscription.scheduler';
import { closeDatabase } from '../shared/db/prisma';
import { startWebhookServer } from './webhook.server';

// Инициализация Sentry должна быть первой, до всех остальных операций
initSentry();
setupGlobalErrorHandlers();

/**
 * Валидация обязательных переменных окружения
 */
function validateConfig(): void {
  const errors: string[] = [];

  if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN.trim() === '') {
    errors.push('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
  }

  if (!process.env.NASA_API_KEY || process.env.NASA_API_KEY.trim() === '') {
    errors.push('NASA_API_KEY не установлен в переменных окружения');
  }

  if (errors.length > 0) {
    console.error('Ошибки конфигурации:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
}

// Валидация конфигурации перед запуском
validateConfig();

const bot = new Bot();
let notificationsService: DonkiNotificationsService | null = null;
let subscriptionScheduler: SubscriptionScheduler | null = null;
let webhookServer: ReturnType<typeof startWebhookServer> | null = null;

// Обработка завершения работы
process.once('SIGINT', async () => {
  if (notificationsService) {
    notificationsService.stop();
  }
  if (subscriptionScheduler) {
    subscriptionScheduler.stop();
  }
  if (webhookServer) {
    webhookServer.close();
  }
  await closeDatabase();
  bot.stop();
});
process.once('SIGTERM', async () => {
  if (notificationsService) {
    notificationsService.stop();
  }
  if (subscriptionScheduler) {
    subscriptionScheduler.stop();
  }
  if (webhookServer) {
    webhookServer.close();
  }
  await closeDatabase();
  bot.stop();
});

// Запуск бота
bot.start()
  .then(() => {
    // Запускаем сервис уведомлений после запуска бота
    const telegram = bot.getTelegram();
    notificationsService = new DonkiNotificationsService(telegram);
    notificationsService.start();

    // Запускаем scheduler подписок
    subscriptionScheduler = new SubscriptionScheduler(telegram);
    subscriptionScheduler.start();

    // Запускаем webhook сервер для Stripe (опционально, только если нужен)
    const webhookPort = process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT, 10) : 3000;
    if (process.env.STRIPE_SECRET_KEY) {
      webhookServer = startWebhookServer(webhookPort);
    } else {
      console.log('Stripe webhook server is disabled (STRIPE_SECRET_KEY not set)');
    }
  })
  .catch((error) => {
    console.error('Ошибка запуска бота:', error);
    Sentry.captureException(error);
    Sentry.flush(2000).then(() => {
      process.exit(1);
    });
  }); 