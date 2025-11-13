import { prisma } from '../prisma';

export interface CreatePremiumData {
  telegramId: string;
  until: Date;
  active?: boolean;
}

export class PremiumRepository {
  /**
   * Создает новую Premium подписку
   */
  async create(data: CreatePremiumData) {
    return await prisma.premium.create({
      data: {
        telegramId: data.telegramId,
        until: data.until,
        active: data.active ?? true,
      },
    });
  }

  /**
   * Получает активную Premium подписку для пользователя
   */
  async findActiveByTelegramId(telegramId: string) {
    return await prisma.premium.findFirst({
      where: {
        telegramId,
        active: true,
        until: {
          gte: new Date(),
        },
      },
      orderBy: {
        until: 'desc',
      },
    });
  }

  /**
   * Получает все Premium подписки для пользователя
   */
  async findByTelegramId(telegramId: string) {
    return await prisma.premium.findMany({
      where: { telegramId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получает Premium подписку по ID
   */
  async findById(id: number) {
    return await prisma.premium.findUnique({
      where: { id },
    });
  }

  /**
   * Проверяет, есть ли у пользователя активная Premium подписка
   */
  async isPremium(telegramId: string): Promise<boolean> {
    const premium = await this.findActiveByTelegramId(telegramId);
    return premium !== null;
  }

  /**
   * Обновляет Premium подписку
   */
  async update(id: number, data: Partial<CreatePremiumData>) {
    return await prisma.premium.update({
      where: { id },
      data: {
        ...(data.telegramId && { telegramId: data.telegramId }),
        ...(data.until && { until: data.until }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
  }

  /**
   * Деактивирует Premium подписку
   */
  async deactivate(id: number) {
    return await this.update(id, { active: false });
  }

  /**
   * Удаляет Premium подписку
   */
  async delete(id: number) {
    return await prisma.premium.delete({
      where: { id },
    });
  }

  /**
   * Деактивирует все истекшие Premium подписки
   */
  async deactivateExpired() {
    return await prisma.premium.updateMany({
      where: {
        active: true,
        until: {
          lt: new Date(),
        },
      },
      data: {
        active: false,
      },
    });
  }
}

export const premiumRepository = new PremiumRepository();

