import { Context } from 'telegraf';
import { BotContext } from '../types';
import { AsteroidsApi } from '../../../features/asteroids/api';
import { config } from '../../../app/config';

const asteroidsApi = new AsteroidsApi(config.nasa.apiKey);

export async function handleAsteroids(ctx: Context & BotContext) {
  try {
    const asteroids = await asteroidsApi.getNearEarthObjects(7);
    
    if (!asteroids || asteroids.length === 0) {
      await ctx.reply('За последние 7 дней не было обнаружено астероидов, приближающихся к Земле.');
      return;
    }

    const hazardousAsteroids = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
    const nonHazardousAsteroids = asteroids.filter(a => !a.is_potentially_hazardous_asteroid);

    // Отправляем общую статистику
    await ctx.reply(`☄️ Информация об астероидах за последние 7 дней:\n\n` +
      `⚠️ Потенциально опасных: ${hazardousAsteroids.length}\n` +
      `🟢 Безопасных: ${nonHazardousAsteroids.length}`);

    // Отправляем информацию об опасных астероидах
    if (hazardousAsteroids.length > 0) {
      let message = `⚠️ Потенциально опасные астероиды:\n\n`;
      for (const asteroid of hazardousAsteroids) {
        const approach = asteroid.close_approach_data[0];
        message += `${asteroid.name}\n` +
          `Диаметр: ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
          `Дата сближения: ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
          `Скорость: ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
          `Расстояние: ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км\n\n`;

        // Отправляем сообщение, если оно достигло определенной длины
        if (message.length > 3000) {
          await ctx.reply(message);
          message = '';
        }
      }
      if (message) {
        await ctx.reply(message);
      }
    }

    // Отправляем информацию о безопасных астероидах
    if (nonHazardousAsteroids.length > 0) {
      let message = `🟢 Безопасные астероиды:\n\n`;
      for (const asteroid of nonHazardousAsteroids) {
        const approach = asteroid.close_approach_data[0];
        message += `${asteroid.name}\n` +
          `Диаметр: ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
          `Дата сближения: ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
          `Скорость: ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
          `Расстояние: ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км\n\n`;

        // Отправляем сообщение, если оно достигло определенной длины
        if (message.length > 3000) {
          await ctx.reply(message);
          message = '';
        }
      }
      if (message) {
        await ctx.reply(message);
      }
    }
  } catch (error) {
    console.error('Asteroids Error:', error);
    await ctx.reply('Произошла ошибка при получении данных об астероидах. Попробуйте позже.');
  }
} 