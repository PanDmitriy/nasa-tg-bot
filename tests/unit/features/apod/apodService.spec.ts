import { ApodService } from '../../../src/features/apod/services/apodService';
import { ApodApi } from '../../../src/features/apod/api';
import { container } from '../../../src/shared/di/container';
import { clearCache } from '../../../src/shared/lib/cache';

// Мокаем кеш
jest.mock('../../../src/shared/lib/cache', () => ({
  getCached: jest.fn((key, fetcher) => fetcher()),
  clearCache: jest.fn(),
}));

describe('ApodService', () => {
  let service: ApodService;
  let mockApi: jest.Mocked<ApodApi>;

  beforeEach(() => {
    // Создаем мок API
    mockApi = {
      getApod: jest.fn(),
    } as unknown as jest.Mocked<ApodApi>;

    // Устанавливаем мок в контейнер
    container.setApodApi(mockApi);
    service = container.apodService;
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearCache();
  });

  describe('getRandomApod', () => {
    it('должен вернуть случайный APOD', async () => {
      const mockApod = {
        date: '2024-01-15',
        explanation: 'Test explanation',
        media_type: 'image',
        service_version: 'v1',
        title: 'Test APOD',
        url: 'https://example.com/image.jpg',
      };

      mockApi.getApod.mockResolvedValue(mockApod);

      const result = await service.getRandomApod();

      expect(result).toEqual(mockApod);
      expect(mockApi.getApod).toHaveBeenCalled();
    });

    it('должен генерировать валидную дату', async () => {
      const mockApod = {
        date: '2024-01-15',
        explanation: 'Test',
        media_type: 'image',
        service_version: 'v1',
        title: 'Test',
        url: 'https://example.com/image.jpg',
      };

      mockApi.getApod.mockResolvedValue(mockApod);

      await service.getRandomApod();

      const callArgs = mockApi.getApod.mock.calls[0][0];
      expect(callArgs).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatApodAsImage', () => {
    it('должен форматировать APOD для изображения', () => {
      const apod = {
        date: '2024-01-15',
        explanation: 'This is a test explanation that should be truncated',
        media_type: 'image',
        service_version: 'v1',
        title: 'Test APOD',
        url: 'https://example.com/image.jpg',
      };

      const result = service.formatApodAsImage(apod);

      expect(result).toContain('Test APOD');
      expect(result).toContain('2024-01-15');
      expect(result).toContain('NASA Astronomy Picture of the Day');
    });
  });

  describe('formatApodAsText', () => {
    it('должен форматировать APOD для текста', () => {
      const apod = {
        date: '2024-01-15',
        explanation: 'Full explanation',
        media_type: 'video',
        service_version: 'v1',
        title: 'Test APOD',
        url: 'https://example.com/video.mp4',
      };

      const result = service.formatApodAsText(apod);

      expect(result).toContain('Test APOD');
      expect(result).toContain('Full explanation');
      expect(result).toContain('https://example.com/video.mp4');
    });
  });
});

