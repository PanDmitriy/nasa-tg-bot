import 'dotenv/config';
import { Bot } from '../processes/bot';
import { DonkiNotificationsService } from '../processes/notifications/donki-notifications';
import { closeDatabase } from '../shared/db/prisma';

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
bot.start().then(() => {
  // Запускаем сервис уведомлений после запуска бота
  const telegram = bot.getTelegram();
  notificationsService = new DonkiNotificationsService(telegram);
  notificationsService.start();
}); 