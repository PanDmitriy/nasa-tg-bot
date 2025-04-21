import axios from 'axios';
import dotenv from 'dotenv';
import { NasaPhoto, ISSLocation, EPICImage, AsteroidFeed, Asteroid } from './types/index.js';

dotenv.config();

class NasaApi {
  private readonly NASA_API_KEY: string | undefined;
  private readonly APOD_URL: string;
  private readonly ISS_URL: string = 'https://api.wheretheiss.at/v1/satellites/25544';
  private readonly EPIC_URL: string = 'https://api.nasa.gov/EPIC/api/natural';
  private readonly NEO_URL: string = 'https://api.nasa.gov/neo/rest/v1/feed';

  constructor() {
    this.NASA_API_KEY = process.env.NASA_API_KEY;
    this.APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${this.NASA_API_KEY}`;
  }

  async getPhotoOfDay(): Promise<NasaPhoto> {
    try {
      if (!this.NASA_API_KEY) {
        throw new Error('NASA API key is not configured');
      }

      const response = await axios.get<NasaPhoto>(this.APOD_URL);
      return response.data;
    } catch (error) {
      console.error('Error while requesting photo of day from NASA:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getISSLocation(): Promise<ISSLocation> {
    try {
      const response = await axios.get<ISSLocation>(this.ISS_URL);
      const data = response.data;

      // Определяем видимость на основе солнечной широты
      const visibility = data.solar_lat > 0 ? 'Дневная' : 'Ночная';

      return {
        ...data,
        visibility
      };
    } catch (error) {
      console.error('Error while requesting ISS location:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getEarthImage(): Promise<EPICImage> {
    try {
      if (!this.NASA_API_KEY) {
        throw new Error('NASA API key is not configured');
      }

      const response = await axios.get<EPICImage[]>(`${this.EPIC_URL}?api_key=${this.NASA_API_KEY}`);
      if (response.data.length === 0) {
        throw new Error('No Earth images available');
      }

      // Получаем последнее доступное изображение
      const latestImage = response.data[0];
      
      // Формируем URL для изображения
      const date = new Date(latestImage.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      latestImage.image = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${latestImage.image}.png`;

      return latestImage;
    } catch (error) {
      console.error('Error while requesting Earth image:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getAsteroids(days: number = 7): Promise<Asteroid[]> {
    try {
      if (!this.NASA_API_KEY) {
        throw new Error('NASA API key is not configured');
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const response = await axios.get<AsteroidFeed>(`${this.NEO_URL}`, {
        params: {
          api_key: this.NASA_API_KEY,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      });

      // Собираем все астероиды в один массив
      const allAsteroids: Asteroid[] = [];
      Object.values(response.data.near_earth_objects).forEach(asteroids => {
        allAsteroids.push(...asteroids);
      });

      // Сортируем по дате максимального сближения
      return allAsteroids.sort((a, b) => {
        const dateA = new Date(a.close_approach_data[0].close_approach_date);
        const dateB = new Date(b.close_approach_data[0].close_approach_date);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('Error while requesting asteroids:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getLatestMarsPhotos(rover: string): Promise<any[]> {
    try {
      if (!this.NASA_API_KEY) {
        throw new Error('NASA API key is not configured');
      }

      const response = await axios.get(
        `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${this.NASA_API_KEY}`
      );
      return response.data.latest_photos;
    } catch (error) {
      console.error('Error while requesting Mars photos:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const nasa = new NasaApi(); 