import 'dotenv/config';
import { Bot } from '../processes/bot';
import { DonkiNotificationsService } from '../processes/notifications/donki-notifications';
import { closeDatabase } from '../shared/db/prisma';

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

// Обработка завершения работы
process.once('SIGINT', async () => {
  if (notificationsService) {
    notificationsService.stop();
  }
  await closeDatabase();
  bot.stop();
});
process.once('SIGTERM', async () => {
  if (notificationsService) {
    notificationsService.stop();
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
  })
  .catch((error) => {
    console.error('Ошибка запуска бота:', error);
    process.exit(1);
  }); 