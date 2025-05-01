import { BotContext } from '../types';
import { config } from '../../../app/config';

export async function handleStart(ctx: BotContext) {
  const commands = config.bot.commands
    .filter(cmd => cmd.command !== 'start')
    .map(cmd => `• /${cmd.command} - ${cmd.description}`)
    .join('\n');

  const message = `🚀 <b>Добро пожаловать в SpaceView NASA бот!</b>\n\n` +
    `🌌 Я помогу вам исследовать космос и узнать больше о нашей Вселенной.\n\n` +
    `📝 <b>Доступные команды:</b>\n${commands}\n\n` +
    `❓ Используйте /help для получения подробной информации о командах.`;

  await ctx.reply(message, { parse_mode: 'HTML' });
} 