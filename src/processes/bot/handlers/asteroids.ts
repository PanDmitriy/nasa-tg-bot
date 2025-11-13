import { Context } from 'telegraf';
import { BotContext } from '../types';
import { container } from '../../../shared/di/container';
import { logger } from '../../../shared/logger';

export async function handleAsteroids(ctx: Context & BotContext) {
  try {
    const asteroids = await container.asteroidsService.getAsteroids(7);
    
    if (!asteroids || asteroids.length === 0) {
      await ctx.reply('🌍 За последние 7 дней не было обнаружено астероидов, приближающихся к Земле.');
      return;
    }

    const { hazardous, nonHazardous } = container.asteroidsService.separateAsteroids(asteroids);
    const sortedNonHazardous = container.asteroidsService.sortByDistance(nonHazardous).slice(0, 5);

    // Отправляем общую статистику
    await ctx.reply(
      `☄️ <b>Информация об астероидах за последние 7 дней</b>\n\n` +
      `⚠️ <b>Потенциально опасных:</b> ${hazardous.length}\n` +
      `🟢 <b>Ближайших безопасных:</b> ${sortedNonHazardous.length} из ${nonHazardous.length}`,
      { parse_mode: 'HTML' }
    );

    // Отправляем информацию об опасных астероидах
    if (hazardous.length > 0) {
      const messages = container.asteroidsService.formatAsteroidsMessage(
        hazardous,
        '⚠️ <b>Потенциально опасные астероиды:</b>',
        (a) => container.asteroidsService.formatHazardousAsteroid(a)
      );
      
      for (const message of messages) {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    }

    // Отправляем информацию о ближайших безопасных астероидах
    if (sortedNonHazardous.length > 0) {
      const messages = container.asteroidsService.formatAsteroidsMessage(
        sortedNonHazardous,
        '🟢 <b>Ближайшие безопасные астероиды:</b>',
        (a) => container.asteroidsService.formatSafeAsteroid(a)
      );
      
      for (const message of messages) {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    logger.error('Asteroids Error', error);
    // Ошибки обрабатываются глобальным middleware
    throw error;
  }
}
