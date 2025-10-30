import { NasaApi } from '../../../shared/api/nasa';

interface EarthImage {
  identifier: string;
  caption: string;
  image: string;
  version: string;
  date: string;
}

interface EarthImageEx extends EarthImage {
  isFallback?: boolean;
  type?: 'natural' | 'enhanced';
}

export class EarthApi extends NasaApi {
  constructor() {
    super('', 'https://epic.gsfc.nasa.gov');
  }

  async getLatestEarthImage(type: 'natural' | 'enhanced' = 'natural'): Promise<EarthImage> {
    const data = await this.get<EarthImage[]>(`/api/${type}`);
    const latest = data[0];
    
    return {
      ...latest,
      image: `https://epic.gsfc.nasa.gov/archive/${type}/${latest.date.split(' ')[0].replace(/-/g, '/')}/png/${latest.image}.png`
    };
  }

  async getAvailableDates(type: 'natural' | 'enhanced' = 'natural'): Promise<string[]> {
    // returns array of 'YYYY-MM-DD'
    return this.get<string[]>(`/api/${type}/available`);
  }

  async getImageByDate(type: 'natural' | 'enhanced', date: string): Promise<EarthImage> {
    const data = await this.get<EarthImage[]>(`/api/${type}/date/${date}`);
    const first = data[0];
    return {
      ...first,
      image: `https://epic.gsfc.nasa.gov/archive/${type}/${date.replace(/-/g, '/')}/png/${first.image}.png`
    };
  }

  async getLatestEarthImageWithFallback(type: 'natural' | 'enhanced' = 'natural'): Promise<EarthImageEx> {
    try {
      const img = await this.getLatestEarthImage(type);
      return { ...img, isFallback: false, type };
    } catch {
      // try fallback to last available date
      const dates = await this.getAvailableDates(type);
      if (!dates || dates.length === 0) {
        throw new Error('Нет доступных дат EPIC');
      }
      const lastDate = dates[dates.length - 1];
      const img = await this.getImageByDate(type, lastDate);
      return { ...img, isFallback: true, type };
    }
  }
} 