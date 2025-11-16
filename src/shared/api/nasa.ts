import axios, { AxiosInstance } from 'axios';
import { config } from '../../app/config';
import { getCached } from '../lib/cache';

export class NasaApi {
  protected client: AxiosInstance;
  protected apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.nasa.gov') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.api.timeout,
      params: this.apiKey ? { api_key: this.apiKey } : undefined
    });
  }

  protected async get<T>(endpoint: string, params: Record<string, string | number> = {}, ttl: number = 3600): Promise<T> {
    // Создаем уникальный ключ для кеша на основе endpoint и params
    const cacheKey = `nasa:${endpoint}:${JSON.stringify(params)}`;
    
    return getCached(
      cacheKey,
      async () => {
        const maxAttempts = config.api.maxRetries;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const response = await this.client.get<T>(endpoint, { params });
            return response.data;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (axios.isAxiosError(error)) {
              const status = error.response?.status;
              const retriable = !status || status === 429 || (status >= 500 && status < 600);

              // Если ошибка не retriable или это последняя попытка — выбрасываем сразу
              if (!retriable || attempt === maxAttempts) {
                const message = error.response?.data?.error?.message || error.message;
                throw new Error(`NASA API Error: ${status ? `${status} - ` : ''}${message}`);
              }

              // Retry с exponential backoff
              const backoffMs = 500 * Math.pow(2, attempt - 1);
              await new Promise((r) => setTimeout(r, backoffMs));
              continue;
            }

            // Не-Axios ошибка — выбрасываем сразу
            throw lastError;
          }
        }

        // Fallback (на самом деле недостижимо, но TypeScript требует)
        throw lastError || new Error('Unexpected error while requesting NASA API');
      },
      ttl
    );
  }
} 