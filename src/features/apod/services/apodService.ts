import { ApodApi } from '../api';
import { config } from '../../../app/config';
import { getCached } from '../../../shared/lib/cache';

export interface ApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}

/**
 * Сервис для работы с APOD (Astronomy Picture of the Day)
 * Содержит бизнес-логику работы с APOD данными
 */
export class ApodService {
  constructor(private apodApi: ApodApi) {}

  /**
   * Генерирует случайную дату между начальной датой APOD и конечной датой
   * @returns Дата в формате YYYY-MM-DD
   */
  private generateRandomDate(): string {
    const startDate = new Date(config.apod.startDate);
    const endDate = new Date(config.apod.endDate);
    
    // Генерируем случайное количество дней между датами
    const timeDiff = endDate.getTime() - startDate.getTime();
    const randomTime = Math.random() * timeDiff;
    const randomDate = new Date(startDate.getTime() + randomTime);
    
    // Форматируем дату в YYYY-MM-DD
    const year = randomDate.getFullYear();
    const month = String(randomDate.getMonth() + 1).padStart(2, '0');
    const day = String(randomDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Получает случайное изображение дня
   * Кешируется на 1 час, чтобы пользователи получали одинаковый случайный APOD в течение часа
   */
  async getRandomApod(): Promise<ApodResponse> {
    return getCached(
      'apod:random:hourly',
      async () => {
        const randomDate = this.generateRandomDate();
        return this.apodApi.getApod(randomDate);
      },
      3600 // 1 час
    );
  }

  /**
   * Форматирует APOD для отправки как изображение
   */
  formatApodAsImage(apod: ApodResponse): string {
    return `🌌 <b>${apod.title}</b>\n\n` +
      `📅 <i>${new Date(apod.date).toLocaleString('ru-RU')}</i>\n\n` +
      `${apod.explanation.substring(0, 500)}...\n\n` +
      `📸 <i>NASA Astronomy Picture of the Day</i>`;
  }

  /**
   * Форматирует APOD для отправки как текст (для видео)
   */
  formatApodAsText(apod: ApodResponse): string {
    return `🌌 <b>${apod.title}</b>\n\n` +
      `📅 <i>${new Date(apod.date).toLocaleString('ru-RU')}</i>\n\n` +
      `${apod.explanation}\n\n` +
      `🔗 <a href="${apod.url}">Ссылка на медиа</a>`;
  }
}

