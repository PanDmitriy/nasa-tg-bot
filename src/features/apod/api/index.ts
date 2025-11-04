import { NasaApi } from '../../../shared/api/nasa';

interface ApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

export class ApodApi extends NasaApi {
  async getApod(date?: string): Promise<ApodResponse> {
    const params: Record<string, string> = date ? { date } : {};
    return this.get<ApodResponse>('/planetary/apod', params);
  }
} 