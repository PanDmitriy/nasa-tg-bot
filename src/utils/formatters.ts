import { config } from '../config.js';
import { ISSLocation, EPICImage, Asteroid } from '../types/index.js';

export const formatters = {
  formatDate(date: Date): string {
    return date.toLocaleString('ru-RU', {
      timeZone: config.timezone,
      ...config.dateFormat
    });
  },

  formatISSMessage(data: ISSLocation): string {
    return `🛰️ *Международная космическая станция*\n\n` +
      `🌍 *Координаты:*\n` +
      `Широта: ${data.latitude.toFixed(4)}°\n` +
      `Долгота: ${data.longitude.toFixed(4)}°\n\n` +
      `📊 *Параметры орбиты:*\n` +
      `Скорость: ${(data.velocity * 3.6).toFixed(2)} км/ч\n` +
      `Высота: ${data.altitude.toFixed(2)} км\n` +
      `Видимость: ${data.visibility}\n` +
      `Зона покрытия: ${data.footprint.toFixed(2)} км\n\n` +
      `☀️ *Солнечная позиция:*\n` +
      `Широта: ${data.solar_lat.toFixed(2)}°\n` +
      `Долгота: ${data.solar_lon.toFixed(2)}°\n\n` +
      `🕒 *Время обновления:*\n` +
      `${this.formatDate(new Date(data.timestamp * 1000))}`;
  },

  formatEarthMessage(image: EPICImage): string {
    return `🌍 *Снимок Земли из космоса*\n\n` +
      `📅 Дата: ${this.formatDate(new Date(image.date))}\n` +
      `📍 Координаты съемки:\n` +
      `Широта: ${image.lat?.toFixed(2) || 'неизвестно'}°\n` +
      `Долгота: ${image.lon?.toFixed(2) || 'неизвестно'}°\n\n` +
      `🛰️ Снято с космического аппарата DSCOVR`;
  },

  formatAsteroidMessage(asteroids: Asteroid[]): string {
    if (asteroids.length === 0) {
      return 'В ближайшие дни астероиды не будут пролетать рядом с Землей.';
    }

    let message = '🌍 *Ближайшие астероиды*\n\n';
    
    asteroids.slice(0, 5).forEach((asteroid, index) => {
      const approach = asteroid.close_approach_data[0];
      const diameter = asteroid.estimated_diameter.kilometers;
      const avgDiameter = ((diameter.estimated_diameter_min + diameter.estimated_diameter_max) / 2).toFixed(2);
      
      message += `*Астероид ${index + 1}: ${asteroid.name}*\n` +
        `📅 Дата сближения: ${this.formatDate(new Date(approach.close_approach_date))}\n` +
        `📏 Диаметр: ~${avgDiameter} км\n` +
        `🚀 Скорость: ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(2)} км/ч\n` +
        `🌍 Расстояние: ${parseFloat(approach.miss_distance.kilometers).toFixed(2)} км\n` +
        (asteroid.is_potentially_hazardous_asteroid ? '⚠️ *Потенциально опасен!*\n' : '') +
        `🔗 [Подробнее](${asteroid.nasa_jpl_url})\n\n`;
    });

    if (asteroids.length > 5) {
      message += `_И еще ${asteroids.length - 5} астероидов..._`;
    }

    return message;
  }
}; 