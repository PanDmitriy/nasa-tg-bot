import { prisma } from '../prisma';

export class UserRepository {
  /**
   * Создает или получает пользователя по telegramId
   */
  async findOrCreate(telegramId: number) {
    return await prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId },
    });
  }

  /**
   * Получает пользователя по telegramId
   */
  async findByTelegramId(telegramId: number) {
    return await prisma.user.findUnique({
      where: { telegramId },
    });
  }

  /**
   * Получает пользователя по ID
   */
  async findById(id: number) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Создает нового пользователя
   */
  async create(telegramId: number) {
    return await prisma.user.create({
      data: { telegramId },
    });
  }

  /**
   * Удаляет пользователя
   */
  async delete(telegramId: number) {
    return await prisma.user.delete({
      where: { telegramId },
    });
  }
}

export const userRepository = new UserRepository();

