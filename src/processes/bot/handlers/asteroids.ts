import { Context } from 'telegraf';
import { BotContext } from '../types';
import { AsteroidsApi } from '../../../features/asteroids/api';
import { config } from '../../../app/config';

const asteroidsApi = new AsteroidsApi(config.nasa.apiKey);

export async function handleAsteroids(ctx: Context & BotContext) {
  try {
    const asteroids = await asteroidsApi.getNearEarthObjects(7);
    
    if (!asteroids || asteroids.length === 0) {
      await ctx.reply('🌍 За последние 7 дней не было обнаружено астероидов, приближающихся к Земле.');
      return;
    }

    const hazardousAsteroids = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
    const nonHazardousAsteroids = asteroids
      .filter(a => !a.is_potentially_hazardous_asteroid)
      .sort((a, b) => {
        const distanceA = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
        const distanceB = parseFloat(b.close_approach_data[0].miss_distance.kilometers);
        return distanceA - distanceB;
      })
      .slice(0, 5); // Берем только 5 ближайших безопасных астероидов

    // Отправляем общую статистику
    await ctx.reply(`☄️ <b>Информация об астероидах за последние 7 дней</b>\n\n` +
      `⚠️ <b>Потенциально опасных:</b> ${hazardousAsteroids.length}\n` +
      `🟢 <b>Ближайших безопасных:</b> ${nonHazardousAsteroids.length} из ${asteroids.length - hazardousAsteroids.length}`, 
      { parse_mode: 'HTML' });

    // Отправляем информацию об опасных астероидах
    if (hazardousAsteroids.length > 0) {
      let message = `⚠️ <b>Потенциально опасные астероиды:</b>\n\n`;
      for (const asteroid of hazardousAsteroids) {
        const approach = asteroid.close_approach_data[0];
        message += `🔴 <b>${asteroid.name}</b>\n` +
          `📏 <b>Диаметр:</b> ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
          `📅 <b>Дата сближения:</b> ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
          `⚡ <b>Скорость:</b> ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
          `🌍 <b>Расстояние:</b> ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км\n\n`;

        // Отправляем сообщение, если оно достигло определенной длины
        if (message.length > 3000) {
          await ctx.reply(message, { parse_mode: 'HTML' });
          message = '';
        }
      }
      if (message) {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    }

    // Отправляем информацию о ближайших безопасных астероидах
    if (nonHazardousAsteroids.length > 0) {
      let message = `🟢 <b>Ближайшие безопасные астероиды:</b>\n\n`;
      for (const asteroid of nonHazardousAsteroids) {
        const approach = asteroid.close_approach_data[0];
        message += `🔵 <b>${asteroid.name}</b>\n` +
          `📏 <b>Диаметр:</b> ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
          `📅 <b>Дата сближения:</b> ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
          `⚡ <b>Скорость:</b> ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
          `🌍 <b>Расстояние:</b> ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км\n\n`;

        // Отправляем сообщение, если оно достигло определенной длины
        if (message.length > 3000) {
          await ctx.reply(message, { parse_mode: 'HTML' });
          message = '';
        }
      }
      if (message) {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    console.error('Asteroids Error:', error);
    await ctx.reply('❌ Произошла ошибка при получении данных об астероидах. Попробуйте позже.');
  }
} 