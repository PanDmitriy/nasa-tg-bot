import { config } from '../../app/config';
import { createError } from '../../shared/lib/errorHandler/errorHandler';

interface APODResponse {
  url: string;
  title: string;
  explanation: string;
  copyright?: string;
}

interface EarthImage {
  date: string;
  image: string;
}

interface Asteroid {
  name: string;
  diameter: number;
  distance: number;
  velocity: number;
  is_potentially_hazardous: boolean;
}

interface EarthResponse {
  date: string;
  image: string;
}

interface AsteroidsResponse {
  near_earth_objects: {
    [key: string]: Array<{
      name: string;
      estimated_diameter: {
        meters: {
          estimated_diameter_max: number;
        };
      };
      close_approach_data: Array<{
        miss_distance: {
          kilometers: number;
        };
        relative_velocity: {
          kilometers_per_hour: number;
        };
      }>;
      is_potentially_hazardous_asteroid: boolean;
    }>;
  };
}

export class NasaAPI {
  private static readonly baseUrl = config.nasa.baseUrl;
  private static readonly apiKey = config.nasa.apiKey;

  static async getPhotoOfDay(): Promise<APODResponse> {
    const response = await fetch(`${this.baseUrl}/planetary/apod?api_key=${this.apiKey}`);
    if (!response.ok) {
      throw createError('Не удалось получить фото дня', 'APOD_ERROR');
    }
    return response.json() as Promise<APODResponse>;
  }

  static async getEarthImage(): Promise<EarthImage> {
    const response = await fetch(`${this.baseUrl}/EPIC/api/natural?api_key=${this.apiKey}`);
    if (!response.ok) {
      throw createError('Не удалось получить снимок Земли', 'EARTH_ERROR');
    }
    const data = await response.json() as EarthResponse[];
    const latest = data[0];
    return {
      date: latest.date,
      image: `https://epic.gsfc.nasa.gov/archive/natural/${latest.date.split(' ')[0].replace(/-/g, '/')}/png/${latest.image}.png`
    };
  }

  static async getAsteroids(days: number): Promise<Asteroid[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const response = await fetch(
      `${this.baseUrl}/neo/rest/v1/feed?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&api_key=${this.apiKey}`
    );
    
    if (!response.ok) {
      throw createError('Не удалось получить данные об астероидах', 'ASTEROIDS_ERROR');
    }

    const data = await response.json() as AsteroidsResponse;
    return Object.values(data.near_earth_objects)
      .flat()
      .map(asteroid => ({
        name: asteroid.name,
        diameter: asteroid.estimated_diameter.meters.estimated_diameter_max,
        distance: asteroid.close_approach_data[0].miss_distance.kilometers,
        velocity: asteroid.close_approach_data[0].relative_velocity.kilometers_per_hour,
        is_potentially_hazardous: asteroid.is_potentially_hazardous_asteroid
      }));
  }
} 