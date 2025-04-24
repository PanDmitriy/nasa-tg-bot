import { config } from '../../app/config';

interface ISSLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  velocity?: number;
  altitude?: number;
  visibility?: string;
  footprint?: number;
  solar_lat?: number;
  solar_lon?: number;
}

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

interface MarsPhoto {
  earth_date: string;
  camera: {
    full_name: string;
  };
  rover: {
    name: string;
    status: string;
    landing_date: string;
    launch_date: string;
  };
  sol: number;
  currentIndex?: number;
  totalPhotos?: number;
}

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
      (data.velocity ? `Скорость: ${(data.velocity * 3.6).toFixed(2)} км/ч\n` : '') +
      (data.altitude ? `Высота: ${data.altitude.toFixed(2)} км\n` : '') +
      (data.visibility ? `Видимость: ${data.visibility}\n` : '') +
      (data.footprint ? `Зона покрытия: ${data.footprint.toFixed(2)} км\n` : '') +
      (data.solar_lat && data.solar_lon ? `\n☀️ *Солнечная позиция:*\n` +
        `Широта: ${data.solar_lat.toFixed(2)}°\n` +
        `Долгота: ${data.solar_lon.toFixed(2)}°\n` : '') +
      `\n🕒 *Время обновления:*\n` +
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
  },

  formatMarsPhotoMessage(photo: MarsPhoto): string {
    const date = new Date(photo.earth_date);
    const formattedDate = this.formatDate(date);
    
    return `🚀 *Фотография с марсохода ${photo.rover.name}*\n\n` +
      `📅 *Дата съемки:* ${formattedDate}\n` +
      `📷 *Камера:* ${photo.camera.full_name}\n` +
      `🛰️ *Сол:* ${photo.sol}\n\n` +
      `ℹ️ *Дополнительная информация:*\n` +
      `• Статус марсохода: ${photo.rover.status}\n` +
      `• Дата посадки: ${this.formatDate(new Date(photo.rover.landing_date))}\n` +
      `• Дата запуска: ${this.formatDate(new Date(photo.rover.launch_date))}\n\n` +
      (photo.currentIndex !== undefined && photo.totalPhotos !== undefined 
        ? `📸 *${photo.currentIndex + 1} из ${photo.totalPhotos} фотографий*`
        : '');
  }
}; 