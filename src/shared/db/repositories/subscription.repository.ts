import { prisma } from '../prisma';
import { SubscriptionParams } from '../../../entities/subscription/types';

export type SubscriptionType = 'apod' | 'earth' | 'donki';

export interface CreateSubscriptionData {
  telegramId: string;
  chatId: string;
  type: SubscriptionType;
  hourUtc: number;
  params?: SubscriptionParams;
}

export class SubscriptionRepository {
  /**
   * Создает новую подписку
   */
  async create(data: CreateSubscriptionData) {
    return await prisma.subscription.create({
      data: {
        telegramId: data.telegramId,
        chatId: data.chatId,
        type: data.type,
        hourUtc: data.hourUtc,
        params: data.params ?? undefined,
        enabled: true,
      },
    });
  }

  /**
   * Получает все подписки для конкретного чата
   */
  async findByChat(chatId: string) {
    return await prisma.subscription.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получает все активные подписки (enabled = true)
   */
  async findEnabled() {
    return await prisma.subscription.findMany({
      where: { enabled: true },
      orderBy: { hourUtc: 'asc' },
    });
  }

  /**
   * Получает подписку по ID
   */
  async findById(id: number) {
    return await prisma.subscription.findUnique({
      where: { id },
    });
  }

  /**
   * Получает подписку по ID и chatId
   */
  async findByIdAndChat(id: number, chatId: string) {
    return await prisma.subscription.findFirst({
      where: {
        id,
        chatId,
      },
    });
  }

  /**
   * Обновляет подписку
   */
  async update(id: number, data: Partial<CreateSubscriptionData & { enabled?: boolean }>) {
    return await prisma.subscription.update({
      where: { id },
      data: {
        ...(data.telegramId && { telegramId: data.telegramId }),
        ...(data.chatId && { chatId: data.chatId }),
        ...(data.type && { type: data.type }),
        ...(data.hourUtc !== undefined && { hourUtc: data.hourUtc }),
        ...(data.params !== undefined && { params: data.params }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });
  }

  /**
   * Переключает статус подписки (enabled/disabled)
   */
  async toggle(id: number) {
    const subscription = await this.findById(id);

    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }

    return await this.update(id, { enabled: !subscription.enabled });
  }

  /**
   * Отключает подписку (устанавливает enabled = false)
   * Проверяет, что подписка принадлежит указанному chatId
   */
  async disable(id: number, chatId: string) {
    const subscription = await this.findByIdAndChat(id, chatId);

    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found for chat ${chatId}`);
    }

    return await this.update(id, { enabled: false });
  }

  /**
   * Удаляет подписку
   */
  async delete(id: number) {
    return await prisma.subscription.delete({
      where: { id },
    });
  }
}

export const subscriptionRepository = new SubscriptionRepository();

