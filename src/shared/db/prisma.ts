import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Закрытие соединения с БД
export async function closeDatabase() {
  await prisma.$disconnect();
}

