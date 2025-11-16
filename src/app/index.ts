import 'dotenv/config';
import { initSentry, setupGlobalErrorHandlers } from '../shared/logger/sentry';
import { logger } from '../shared/logger';
import { Bot } from '../processes/bot';
import { DonkiNotificationsService } from '../processes/notifications/donki-notifications';
import { SubscriptionScheduler } from '../processes/schedulers/subscription.scheduler';
import { CleanupScheduler } from '../processes/schedulers/cleanup.scheduler';
import { closeDatabase } from '../shared/db/prisma';
import { startWebhookServer } from './webhook.server';

// Настройка глобальных обработчиков ошибок
initSentry();
setupGlobalErrorHandlers();

// Валидация конфигурации выполняется в config/validation.ts при импорте конфигурации

const bot = new Bot();
let notificationsService: DonkiNotificationsService | null = null;
let subscriptionScheduler: SubscriptionScheduler | null = null;
let cleanupScheduler: CleanupScheduler | null = null;
let webhookServer: ReturnType<typeof startWebhookServer> | null = null;

// Обработка завершения работы
process.once('SIGINT', async () => {
  if (notificationsService) {
    notificationsService.stop();
  }
  if (subscriptionScheduler) {
    subscriptionScheduler.stop();
  }
  if (cleanupScheduler) {
    cleanupScheduler.stop();
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
  if (cleanupScheduler) {
    cleanupScheduler.stop();
  }
  if (webhookServer) {
    webhookServer.close();
  }
  await closeDatabase();
  bot.stop();
});

// Запуск бота
bot.start()
  .then(async () => {
    // Запускаем сервис уведомлений после запуска бота
    const telegram = bot.getTelegram();
    notificationsService = new DonkiNotificationsService(telegram);
    await notificationsService.start();

    // Запускаем scheduler подписок
    subscriptionScheduler = new SubscriptionScheduler(telegram);
    subscriptionScheduler.start();

    // Запускаем scheduler очистки старых логов
    cleanupScheduler = new CleanupScheduler();
    cleanupScheduler.start();

    // Запускаем webhook сервер для WebPay (опционально, только если нужен)
    const webhookPort = process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT, 10) : 3000;
    if (process.env.WEBPAY_STORE_ID && process.env.WEBPAY_SECRET_KEY) {
      webhookServer = startWebhookServer(webhookPort);
    } else {
      logger.info('WebPay webhook server is disabled (WEBPAY_STORE_ID or WEBPAY_SECRET_KEY not set)');
    }
  })
  .catch((error) => {
    logger.error('Ошибка запуска бота', error);
    process.exit(1);
  }); 