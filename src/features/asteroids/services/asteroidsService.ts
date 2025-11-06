import { AsteroidsApi } from '../api';

export interface Asteroid {
  id: string;
  name: string;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    miss_distance: {
      kilometers: string;
    };
    relative_velocity: {
      kilometers_per_hour: string;
    };
  }>;
}

/**
 * Сервис для работы с астероидами
 * Содержит бизнес-логику обработки данных об астероидах
 */
export class AsteroidsService {
  constructor(private asteroidsApi: AsteroidsApi) {}

  /**
   * Получает информацию об астероидах за указанное количество дней
   */
  async getAsteroids(days: number = 7): Promise<Asteroid[]> {
    return this.asteroidsApi.getNearEarthObjects(days);
  }

  /**
   * Разделяет астероиды на опасные и безопасные
   */
  separateAsteroids(asteroids: Asteroid[]): {
    hazardous: Asteroid[];
    nonHazardous: Asteroid[];
  } {
    const hazardous = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
    const nonHazardous = asteroids.filter(a => !a.is_potentially_hazardous_asteroid);
    
    return { hazardous, nonHazardous };
  }

  /**
   * Сортирует безопасные астероиды по расстоянию (от ближайших)
   */
  sortByDistance(asteroids: Asteroid[]): Asteroid[] {
    return [...asteroids].sort((a, b) => {
      const distanceA = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
      const distanceB = parseFloat(b.close_approach_data[0].miss_distance.kilometers);
      return distanceA - distanceB;
    });
  }

  /**
   * Форматирует информацию об опасном астероиде для отправки
   */
  formatHazardousAsteroid(asteroid: Asteroid): string {
    const approach = asteroid.close_approach_data[0];
    return `🔴 <b>${asteroid.name}</b>\n` +
      `📏 <b>Диаметр:</b> ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
      `📅 <b>Дата сближения:</b> ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
      `⚡ <b>Скорость:</b> ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
      `🌍 <b>Расстояние:</b> ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км`;
  }

  /**
   * Форматирует информацию о безопасном астероиде для отправки
   */
  formatSafeAsteroid(asteroid: Asteroid): string {
    const approach = asteroid.close_approach_data[0];
    return `🔵 <b>${asteroid.name}</b>\n` +
      `📏 <b>Диаметр:</b> ${asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - ${asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} м\n` +
      `📅 <b>Дата сближения:</b> ${new Date(approach.close_approach_date).toLocaleString('ru-RU')}\n` +
      `⚡ <b>Скорость:</b> ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} км/ч\n` +
      `🌍 <b>Расстояние:</b> ${(parseFloat(approach.miss_distance.kilometers) / 1000).toFixed(0)} тыс. км`;
  }

  /**
   * Форматирует сообщение об астероидах с учетом лимита длины
   */
  formatAsteroidsMessage(
    asteroids: Asteroid[],
    header: string,
    formatter: (asteroid: Asteroid) => string,
    maxLength: number = 3000
  ): string[] {
    const messages: string[] = [];
    let currentMessage = `${header}\n\n`;
    
    for (const asteroid of asteroids) {
      const asteroidText = formatter(asteroid) + '\n\n';
      
      if (currentMessage.length + asteroidText.length > maxLength && currentMessage.length > header.length + 2) {
        messages.push(currentMessage.trim());
        currentMessage = asteroidText;
      } else {
        currentMessage += asteroidText;
      }
    }
    
    if (currentMessage.trim().length > header.length + 2) {
      messages.push(currentMessage.trim());
    }
    
    return messages;
  }
}

