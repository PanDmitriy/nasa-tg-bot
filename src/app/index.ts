import 'dotenv/config';
import { Bot } from '../processes/bot';
import { closeDatabase } from '../shared/db/prisma';

const bot = new Bot();

// Обработка завершения работы
process.once('SIGINT', async () => {
  await closeDatabase();
  bot.stop();
});
process.once('SIGTERM', async () => {
  await closeDatabase();
  bot.stop();
});

// Запуск бота
bot.start(); 