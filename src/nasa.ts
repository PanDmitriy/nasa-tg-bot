import axios from 'axios';
import { NasaPhoto, ISSLocation, EPICImage, AsteroidFeed, Asteroid } from './types/index.js';
import { config } from './config.js';
import { errorHandler } from './utils/errorHandler.js';

class NasaApi {
  private readonly NASA_API_KEY: string;
  private readonly APOD_URL: string;
  private readonly ISS_URL: string;
  private readonly EPIC_URL: string;
  private readonly NEO_URL: string;

  constructor() {
    this.NASA_API_KEY = config.nasa.apiKey;
    this.APOD_URL = `${config.nasa.urls.apod}?api_key=${this.NASA_API_KEY}`;
    this.ISS_URL = config.nasa.urls.iss;
    this.EPIC_URL = config.nasa.urls.epic;
    this.NEO_URL = config.nasa.urls.neo;
  }

  private async makeRequest<T>(url: string, params?: Record<string, string>): Promise<T> {
    try {
      const response = await axios.get<T>(url, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw errorHandler.createError(
          `Ошибка при запросе к NASA API: ${error.message}`,
          'NASA_API_ERROR'
        );
      }
      throw error;
    }
  }

  async getPhotoOfDay(): Promise<NasaPhoto> {
    if (!this.NASA_API_KEY) {
      throw errorHandler.createError('NASA API key не настроен', 'API_KEY_MISSING');
    }

    return this.makeRequest<NasaPhoto>(this.APOD_URL);
  }

  async getISSLocation(): Promise<ISSLocation> {
    const data = await this.makeRequest<ISSLocation>(this.ISS_URL);
    
    return {
      ...data,
      visibility: data.solar_lat > 0 ? 'Дневная' : 'Ночная'
    };
  }

  async getEarthImage(): Promise<EPICImage> {
    if (!this.NASA_API_KEY) {
      throw errorHandler.createError('NASA API key не настроен', 'API_KEY_MISSING');
    }

    const images = await this.makeRequest<EPICImage[]>(`${this.EPIC_URL}?api_key=${this.NASA_API_KEY}`);
    
    if (images.length === 0) {
      throw errorHandler.createError('Нет доступных изображений Земли', 'NO_IMAGES');
    }

    const latestImage = images[0];
    const date = new Date(latestImage.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    latestImage.image = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${latestImage.image}.png`;

    return latestImage;
  }

  async getAsteroids(days: number = 7): Promise<Asteroid[]> {
    if (!this.NASA_API_KEY) {
      throw errorHandler.createError('NASA API key не настроен', 'API_KEY_MISSING');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const response = await this.makeRequest<AsteroidFeed>(this.NEO_URL, {
      api_key: this.NASA_API_KEY,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });

    const allAsteroids: Asteroid[] = [];
    Object.values(response.near_earth_objects).forEach(asteroids => {
      allAsteroids.push(...asteroids);
    });

    return allAsteroids.sort((a, b) => {
      const dateA = new Date(a.close_approach_data[0].close_approach_date);
      const dateB = new Date(b.close_approach_data[0].close_approach_date);
      return dateA.getTime() - dateB.getTime();
    });
  }
}

export const nasa = new NasaApi(); 