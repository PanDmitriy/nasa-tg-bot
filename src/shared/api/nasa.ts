import axios, { AxiosInstance } from 'axios';

export class NasaApi {
  protected client: AxiosInstance;
  protected apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.nasa.gov') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      params: {
        api_key: this.apiKey
      }
    });
  }

  protected async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        throw new Error(`NASA API Error: ${status ? `${status} - ` : ''}${message}`);
      }
      throw error;
    }
  }
} 