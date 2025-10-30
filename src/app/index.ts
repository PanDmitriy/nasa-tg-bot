import 'dotenv/config';
import { Bot } from '../processes/bot';

const bot = new Bot();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

// Запуск бота
bot.start(); 