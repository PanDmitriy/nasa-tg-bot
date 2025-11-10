import { prisma } from '../../shared/db/prisma';

export type SubscriptionType = 'apod' | 'earth' | 'donki';

export interface CreateSubscriptionParams {
  telegramId: string;
  chatId: string;
  type: SubscriptionType;
  hourUtc: number;
  params?: Record<string, any>;
}

export class SubscriptionService {
  /**
   * Создает новую подписку
   */
  async create(params: CreateSubscriptionParams) {
    return await prisma.subscription.create({
      data: {
        telegramId: params.telegramId,
        chatId: params.chatId,
        type: params.type,
        hourUtc: params.hourUtc,
        params: params.params ?? undefined,
        enabled: true,
      },
    });
  }

  /**
   * Получает все подписки для конкретного чата
   */
  async getByChat(chatId: string) {
    return await prisma.subscription.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получает все активные подписки (enabled = true)
   */
  async listAllEnabled() {
    return await prisma.subscription.findMany({
      where: { enabled: true },
      orderBy: { hourUtc: 'asc' },
    });
  }

  /**
   * Переключает статус подписки (enabled/disabled)
   */
  async toggle(id: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }

    return await prisma.subscription.update({
      where: { id },
      data: { enabled: !subscription.enabled },
    });
  }

  /**
   * Удаляет подписку
   */
  async delete(id: number) {
    return await prisma.subscription.delete({
      where: { id },
    });
  }

  /**
   * Получает подписку по ID
   */
  async getById(id: number) {
    return await prisma.subscription.findUnique({
      where: { id },
    });
  }
}

