import * as cron from 'node-cron';
import { prisma } from '../../shared/db/prisma';
import { logger } from '../../shared/logger';

export class CleanupScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  public start() {
    if (this.isRunning) {
      logger.warn('CleanupScheduler уже запущен');
      return;
    }

    this.isRunning = true;
    // Запускаем каждый день в 2:00 UTC
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldLogs();
    });

    logger.info('CleanupScheduler запущен. Очистка каждый день в 2:00 UTC');
  }

  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('CleanupScheduler остановлен');
  }

  private async cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info(`Очищено ${result.count} старых записей из NotificationLog`, {
        deletedCount: result.count,
        cutoffDate: thirtyDaysAgo.toISOString(),
      });
    } catch (error) {
      logger.error('Ошибка при очистке старых логов', error);
    }
  }
}

