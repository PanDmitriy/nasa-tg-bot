import { BotContext } from '../types';
import { config } from '../../../app/config';

export async function handleStart(ctx: BotContext) {
  const commands = config.bot.commands
    .filter(cmd => cmd.command !== 'start')
    .map(cmd => `/${cmd.command} - ${cmd.description}`)
    .join('\n');

  await ctx.reply(`Добро пожаловать в NASA бот! Используйте команды:\n${commands}`);
} 