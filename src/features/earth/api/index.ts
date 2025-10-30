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
  private latestCache: Map<string, { image: EarthImageEx; expiresAt: number }> = new Map();
  private static readonly DEFAULT_TTL_MS = 2 * 60 * 1000;

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
    const cacheKey = `latest:${type}`;
    const now = Date.now();
    const cached = this.latestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.image;
    }
    try {
      const img = await this.getLatestEarthImage(type);
      const enriched = { ...img, isFallback: false, type } as EarthImageEx;
      this.latestCache.set(cacheKey, { image: enriched, expiresAt: now + EarthApi.DEFAULT_TTL_MS });
      return enriched;
    } catch {
      const dates = await this.getAvailableDates(type);
      if (!dates || dates.length === 0) {
        throw new Error('Нет доступных дат EPIC');
      }
      const lastDate = dates[dates.length - 1];
      const img = await this.getImageByDate(type, lastDate);
      const enriched = { ...img, isFallback: true, type } as EarthImageEx;
      this.latestCache.set(cacheKey, { image: enriched, expiresAt: now + EarthApi.DEFAULT_TTL_MS });
      return enriched;
    }
  }
} 