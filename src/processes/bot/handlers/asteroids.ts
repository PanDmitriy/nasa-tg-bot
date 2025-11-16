import { Context, Markup } from 'telegraf';
import { BotContext } from '../types';
import { container } from '../../../shared/di/container';
import { logger } from '../../../shared/logger';

export async function handleAsteroids(ctx: Context & BotContext) {
  try {
    const asteroids = await container.asteroidsService.getAsteroids(7);
    
    if (!asteroids || asteroids.length === 0) {
      const message = `☄️ <b>Астероиды не найдены</b>\n\n` +
        `За последние 7 дней не было обнаружено астероидов, приближающихся к Земле.\n\n` +
        `🌍 <b>Это хорошая новость!</b> Это означает, что в ближайшее время нет потенциальных угроз от околоземных объектов.\n\n` +
        `💡 <b>Попробуйте:</b>\n` +
        `• Проверить другие космические данные (APOD, Earth, DONKI)\n` +
        `• Подписаться на уведомления о новых астероидах`;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🌌 Фото дня', 'quick_apod')],
        [Markup.button.callback('🌍 Земля', 'quick_earth')],
        [Markup.button.callback('🌊 Косм. погода', 'quick_donki')],
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ]);
      
      await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
      return;
    }

    const { hazardous, nonHazardous } = container.asteroidsService.separateAsteroids(asteroids);
    const sortedNonHazardous = container.asteroidsService.sortByDistance(nonHazardous).slice(0, 5);

    // Отправляем общую статистику
    await ctx.reply(
      `☄️ <b>Информация об астероидах</b>\n` +
      `<i>За последние 7 дней</i>\n\n` +
      `─────────────────────\n\n` +
      `⚠️ <b>Потенциально опасных:</b> ${hazardous.length}\n` +
      `🟢 <b>Ближайших безопасных:</b> ${sortedNonHazardous.length} из ${nonHazardous.length}\n\n` +
      `─────────────────────`,
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
      
      for (let i = 0; i < messages.length; i++) {
        const isLast = i === messages.length - 1;
        if (isLast) {
          const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Меню', 'main_menu')]
          ]);
          await ctx.reply(messages[i], { parse_mode: 'HTML', ...keyboard });
        } else {
          await ctx.reply(messages[i], { parse_mode: 'HTML' });
        }
      }
    } else {
      // Если нет безопасных астероидов, добавляем кнопку меню к последнему сообщению
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Меню', 'main_menu')]
      ]);
      await ctx.reply('🏠', { ...keyboard });
    }
  } catch (error) {
    logger.error('Asteroids Error', error);
    // Ошибки обрабатываются глобальным middleware
    throw error;
  }
}
