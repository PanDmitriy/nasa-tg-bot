import axios from 'axios';
import { NasaApi } from '../../../src/shared/api/nasa';
import { getCached } from '../../../src/shared/lib/cache';

// Мокаем axios и кеш
jest.mock('axios');
jest.mock('../../../src/shared/lib/cache', () => ({
  getCached: jest.fn((key, fetcher) => fetcher()),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NasaApi', () => {
  let api: NasaApi;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockClient);
    api = new NasaApi('test-api-key');
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('должен успешно выполнить запрос', async () => {
      const mockResponse = {
        data: { test: 'data' },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      // Используем рефлексию для доступа к protected методу
      const result = await (api as any).get('/test/endpoint');

      expect(result).toEqual({ test: 'data' });
      expect(mockClient.get).toHaveBeenCalledWith('/test/endpoint', { params: {} });
    });

    it('должен передавать параметры в запрос', async () => {
      const mockResponse = {
        data: { test: 'data' },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await (api as any).get('/test/endpoint', { date: '2024-01-15' });

      expect(mockClient.get).toHaveBeenCalledWith('/test/endpoint', {
        params: { date: '2024-01-15' },
      });
    });

    it('должен использовать кеширование', async () => {
      const mockResponse = {
        data: { test: 'data' },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await (api as any).get('/test/endpoint', {}, 3600);

      expect(getCached).toHaveBeenCalled();
    });
  });
});

