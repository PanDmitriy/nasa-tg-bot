import { prisma } from '../prisma';
import { CMEAlertLevel } from '../../../processes/bot/types';

export type EventType = 'cme' | 'flares' | 'sep' | 'gst' | 'ips' | 'notifications' | 'wsaenlil';

export class SubscriptionsRepository {
  // Создать или обновить пользователя
  async ensureUser(telegramId: number): Promise<void> {
    await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId },
    });
  }

  // Получить подписку пользователя на конкретный тип события
  async getSubscription(userId: number, eventType: EventType) {
    return await prisma.donkiSubscription.findUnique({
      where: {
        userId_eventType: {
          userId,
          eventType,
        },
      },
    });
  }

  // Получить все подписки пользователя
  async getUserSubscriptions(userId: number) {
    return await prisma.donkiSubscription.findMany({
      where: { userId },
    });
  }

  // Создать или обновить подписку
  // Для CME: alertLevel может быть 'extreme', 'high', 'all'
  // Для notifications и wsaenlil: alertLevel может быть 'enabled' или null
  async setSubscription(
    userId: number,
    eventType: EventType,
    alertLevel: CMEAlertLevel | 'enabled' | null
  ): Promise<void> {
    await this.ensureUser(userId);

    if (alertLevel === null) {
      // Удаляем подписку
      await prisma.donkiSubscription.deleteMany({
        where: {
          userId,
          eventType,
        },
      });
    } else {
      // Создаем или обновляем подписку
      await prisma.donkiSubscription.upsert({
        where: {
          userId_eventType: {
            userId,
            eventType,
          },
        },
        update: {
          alertLevel,
        },
        create: {
          userId,
          eventType,
          alertLevel,
        },
      });
    }
  }

  // Получить всех пользователей, подписанных на определенный тип события и уровень
  // Для CME: alertLevel может быть 'extreme', 'high', 'all'
  // Для notifications и wsaenlil: alertLevel может быть 'enabled' или не указан (вернет всех подписанных)
  async getSubscribers(eventType: EventType, alertLevel?: CMEAlertLevel | 'enabled'): Promise<number[]> {
    const where: { eventType: EventType; alertLevel?: CMEAlertLevel | 'enabled' } = { eventType };
    if (alertLevel) {
      where.alertLevel = alertLevel;
    }

    const subscriptions = await prisma.donkiSubscription.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    return subscriptions.map(s => s.userId);
  }

  // Получить всех пользователей, подписанных на определенный уровень или выше
  // Например, если пользователь подписан на 'high', он получит уведомления и для 'extreme'
  async getSubscribersForLevel(eventType: EventType, alertLevel: CMEAlertLevel): Promise<number[]> {
    const levelHierarchy: Record<CMEAlertLevel, CMEAlertLevel[]> = {
      'extreme': ['extreme'],
      'high': ['high', 'extreme'],
      'all': ['all', 'high', 'extreme'],
    };

    const levels = levelHierarchy[alertLevel];

    const subscriptions = await prisma.donkiSubscription.findMany({
      where: {
        eventType,
        alertLevel: { in: levels },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return subscriptions.map(s => s.userId);
  }
}

export const subscriptionsRepository = new SubscriptionsRepository();
