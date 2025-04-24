import 'dotenv/config';
import { Bot } from '../processes/bot';
import { config } from './config';

console.log('Bot token:', config.bot.token);

const bot = new Bot();

// Обработка завершения работы
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

// Запуск бота
bot.start(); 