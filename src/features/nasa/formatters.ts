import { config } from '../../app/config';

interface EPICImage {
  date: string;
  image: string;
  lat?: number;
  lon?: number;
}

interface Asteroid {
  name: string;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data: Array<{
    close_approach_date: string;
    miss_distance: {
      kilometers: string;
    };
    relative_velocity: {
      kilometers_per_hour: string;
    };
  }>;
  is_potentially_hazardous_asteroid: boolean;
  nasa_jpl_url: string;
}

export const formatters = {
  formatDate(date: Date): string {
    return date.toLocaleString('ru-RU', {
      timeZone: config.timezone,
      ...config.dateFormat
    });
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