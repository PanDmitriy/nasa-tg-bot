import axios, { AxiosInstance } from 'axios';

interface NasaImageLink {
  href: string;
  rel: string;
  render?: string;
}

interface NasaImageItem {
  data: Array<{
    nasa_id: string;
    title?: string;
    description?: string;
    date_created?: string;
    center?: string;
    keywords?: string[];
    media_type?: string;
  }>;
  links?: NasaImageLink[];
}

interface NasaImagesSearchResponse {
  collection: {
    items: NasaImageItem[];
    metadata: {
      total_hits: number;
    };
    links?: NasaImageLink[];
  };
}

export interface NasaImage {
  nasaId: string;
  title: string;
  description?: string;
  dateCreated?: string;
  imageUrl: string;
  thumbnailUrl?: string;
}

export class ImagesApi {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://images-api.nasa.gov';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Поиск изображений по запросу
   */
  async searchImages(query: string, limit: number = 20): Promise<NasaImage[]> {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.get<NasaImagesSearchResponse>('/search', {
          params: {
            q: query,
            media_type: 'image',
            page_size: Math.min(limit, 100), // API ограничивает максимум 100
          },
        });

        const items = response.data.collection.items || [];
        return this.mapItemsToImages(items);
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
          throw new Error(`NASA Images API Error: ${status ? `${status} - ` : ''}${message}`);
        }
        throw error;
      }
    }
    
    throw new Error('Unexpected error while requesting NASA Images API');
  }

  /**
   * Получение прямых ссылок на изображение
   */
  async getImageAsset(nasaId: string): Promise<{ href: string }[]> {
    try {
      const response = await this.client.get<{ collection: { items: Array<{ href: string }> } }>(
        `/asset/${nasaId}`
      );
      return response.data.collection.items || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Failed to get asset: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Преобразование элементов ответа API в удобный формат
   */
  private mapItemsToImages(items: NasaImageItem[]): NasaImage[] {
    return items
      .filter(item => item.links && item.links.length > 0 && item.data && item.data.length > 0)
      .map(item => {
        const data = item.data[0];
        
        // Ищем ссылку на изображение (prefer render='image', fallback to first link)
        const imageLink = item.links?.find(link => link.render === 'image') || 
                         item.links?.find(link => link.rel === 'preview') ||
                         item.links?.[0];
        const thumbnailLink = item.links?.find(link => link.rel === 'preview');
        
        // Если нет ссылки, используем первую доступную
        const mainImageUrl = imageLink?.href || '';
        
        // Для получения прямого URL нужно запросить asset
        // Но пока используем href напрямую, если он указывает на изображение
        
        return {
          nasaId: data.nasa_id,
          title: data.title || 'Без названия',
          description: data.description,
          dateCreated: data.date_created,
          imageUrl: mainImageUrl,
          thumbnailUrl: thumbnailLink?.href,
        };
      })
      .filter(img => img.imageUrl && img.imageUrl.startsWith('http')); // Фильтруем элементы без валидного URL
  }

  /**
   * Популярные темы для быстрого доступа
   */
  getPopularTopics(): Array<{ id: string; name: string; emoji: string; query: string }> {
    return [
      { id: 'mars', name: 'Марс', emoji: '🔴', query: 'Mars' },
      { id: 'apollo', name: 'Аполлон', emoji: '🚀', query: 'Apollo' },
      { id: 'hubble', name: 'Хаббл', emoji: '🔭', query: 'Hubble Space Telescope' },
      { id: 'saturn', name: 'Сатурн', emoji: '🪐', query: 'Saturn' },
      { id: 'iss', name: 'МКС', emoji: '🌐', query: 'International Space Station' },
      { id: 'earth', name: 'Земля', emoji: '🌍', query: 'Earth' },
      { id: 'moon', name: 'Луна', emoji: '🌙', query: 'Moon' },
      { id: 'nebula', name: 'Туманности', emoji: '🌌', query: 'Nebula' },
      { id: 'galaxy', name: 'Галактики', emoji: '✨', query: 'Galaxy' },
      { id: 'stars', name: 'Звезды', emoji: '⭐', query: 'Stars' },
      { id: 'astronaut', name: 'Астронавты', emoji: '👨‍🚀', query: 'Astronaut' },
      { id: 'rover', name: 'Марсоходы', emoji: '🤖', query: 'Mars Rover' },
    ];
  }
}

