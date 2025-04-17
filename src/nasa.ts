import axios from 'axios';
import dotenv from 'dotenv';
import { NasaPhoto, ISSLocation } from './types/index.js';

dotenv.config();

class NasaApi {
  private readonly NASA_API_KEY: string | undefined;
  private readonly APOD_URL: string;
  private readonly ISS_URL: string = 'http://api.open-notify.org/iss-now.json';

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
      return response.data;
    } catch (error) {
      console.error('Error while requesting ISS location:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const nasa = new NasaApi(); 