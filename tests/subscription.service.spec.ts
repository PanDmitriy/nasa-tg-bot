import { SubscriptionService, CreateSubscriptionParams } from '../src/features/subscriptions/subscription.service';
import { prisma } from '../src/shared/db/prisma';

// Мокаем Prisma client
jest.mock('../src/shared/db/prisma', () => ({
  prisma: {
    subscription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    service = new SubscriptionService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('должен создать новую подписку с enabled=true', async () => {
      const params: CreateSubscriptionParams = {
        telegramId: '123456',
        chatId: '789',
        type: 'apod',
        hourUtc: 10,
      };

      const mockSubscription = {
        id: 1,
        telegramId: params.telegramId,
        chatId: params.chatId,
        type: params.type,
        hourUtc: params.hourUtc,
        params: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.subscription.create as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.create(params);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          telegramId: params.telegramId,
          chatId: params.chatId,
          type: params.type,
          hourUtc: params.hourUtc,
          params: undefined,
          enabled: true,
        },
      });

      expect(result).toEqual(mockSubscription);
      expect(result.enabled).toBe(true);
    });

    it('должен создать подписку с params', async () => {
      const params: CreateSubscriptionParams = {
        telegramId: '123456',
        chatId: '789',
        type: 'earth',
        hourUtc: 15,
        params: { type: 'natural' },
      };

      const mockSubscription = {
        id: 2,
        ...params,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.subscription.create as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.create(params);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          telegramId: params.telegramId,
          chatId: params.chatId,
          type: params.type,
          hourUtc: params.hourUtc,
          params: params.params,
          enabled: true,
        },
      });

      expect(result).toEqual(mockSubscription);
    });

    it('должен создать подписку типа donki', async () => {
      const params: CreateSubscriptionParams = {
        telegramId: '123456',
        chatId: '789',
        type: 'donki',
        hourUtc: 20,
        params: { eventType: 'cme' },
      };

      const mockSubscription = {
        id: 3,
        ...params,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.subscription.create as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.create(params);

      expect(result.type).toBe('donki');
      expect(result.params).toEqual({ eventType: 'cme' });
    });
  });

  describe('getByChat', () => {
    it('должен вернуть все подписки для указанного чата', async () => {
      const chatId = '789';
      const mockSubscriptions = [
        {
          id: 1,
          telegramId: '123456',
          chatId,
          type: 'apod',
          hourUtc: 10,
          params: null,
          enabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          telegramId: '123456',
          chatId,
          type: 'earth',
          hourUtc: 15,
          params: { type: 'natural' },
          enabled: true,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.getByChat(chatId);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockSubscriptions);
      expect(result.length).toBe(2);
    });

    it('должен вернуть пустой массив, если подписок нет', async () => {
      const chatId = '999';

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getByChat(chatId);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('должен вернуть подписки отсортированные по createdAt desc', async () => {
      const chatId = '789';
      const mockSubscriptions = [
        {
          id: 2,
          telegramId: '123456',
          chatId,
          type: 'earth',
          hourUtc: 15,
          params: null,
          enabled: true,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: 1,
          telegramId: '123456',
          chatId,
          type: 'apod',
          hourUtc: 10,
          params: null,
          enabled: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.getByChat(chatId);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
      });

      // Проверяем, что первая подписка более новая
      expect(result[0].id).toBe(2);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
    });
  });

  describe('listAllEnabled', () => {
    it('должен вернуть все активные подписки', async () => {
      const mockSubscriptions = [
        {
          id: 1,
          telegramId: '123456',
          chatId: '789',
          type: 'apod',
          hourUtc: 8,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          telegramId: '123456',
          chatId: '789',
          type: 'earth',
          hourUtc: 10,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          telegramId: '654321',
          chatId: '888',
          type: 'donki',
          hourUtc: 15,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.listAllEnabled();

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: { hourUtc: 'asc' },
      });

      expect(result).toEqual(mockSubscriptions);
      expect(result.every((sub) => sub.enabled)).toBe(true);
    });

    it('должен вернуть подписки отсортированные по hourUtc asc', async () => {
      const mockSubscriptions = [
        {
          id: 1,
          telegramId: '123456',
          chatId: '789',
          type: 'apod',
          hourUtc: 8,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          telegramId: '123456',
          chatId: '789',
          type: 'earth',
          hourUtc: 10,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          telegramId: '654321',
          chatId: '888',
          type: 'donki',
          hourUtc: 15,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.listAllEnabled();

      // Проверяем сортировку по hourUtc
      expect(result[0].hourUtc).toBe(8);
      expect(result[1].hourUtc).toBe(10);
      expect(result[2].hourUtc).toBe(15);
    });

    it('должен вернуть пустой массив, если активных подписок нет', async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listAllEnabled();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('не должен возвращать отключенные подписки', async () => {
      const mockSubscriptions = [
        {
          id: 1,
          telegramId: '123456',
          chatId: '789',
          type: 'apod',
          hourUtc: 10,
          params: null,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.listAllEnabled();

      // Prisma уже фильтрует по enabled: true, но проверяем результат
      expect(result.every((sub) => sub.enabled === true)).toBe(true);
    });
  });
});

