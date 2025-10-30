import axios, { AxiosInstance } from 'axios';

export class NasaApi {
  protected client: AxiosInstance;
  protected apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.nasa.gov') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      params: this.apiKey ? { api_key: this.apiKey } : undefined
    });
  }

  protected async get<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.get<T>(endpoint, { params });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const retriable = !status || status === 429 || (status >= 500 && status < 600);
          if (retriable && attempt < maxAttempts) {
            const backoffMs = 500 * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          const message = error.response?.data?.error?.message || error.message;
          throw new Error(`NASA API Error: ${status ? `${status} - ` : ''}${message}`);
        }
        throw error;
      }
    }
    // Should never reach here
    throw new Error('Unexpected error while requesting NASA API');
  }
} 