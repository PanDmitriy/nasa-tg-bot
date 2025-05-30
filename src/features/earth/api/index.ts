import { NasaApi } from '../../../shared/api/nasa';

interface EarthImage {
  identifier: string;
  caption: string;
  image: string;
  version: string;
  date: string;
}

export class EarthApi extends NasaApi {
  async getLatestEarthImage(): Promise<EarthImage> {
    const data = await this.get<EarthImage[]>('/EPIC/api/natural');
    const latest = data[0];
    
    return {
      ...latest,
      image: `https://epic.gsfc.nasa.gov/archive/natural/${latest.date.split(' ')[0].replace(/-/g, '/')}/png/${latest.image}.png`
    };
  }
} 