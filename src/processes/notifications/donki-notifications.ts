import { Telegram } from 'telegraf';
import { DonkiCME } from '../../features/donki/api';
import { container } from '../../shared/di/container';
import { subscriptionsRepository, EventType } from '../../shared/db/repositories/subscriptions';
import { CMEAlertLevel } from '../bot/types';
import { formatCMESimple, formatNotificationSimple, formatWSAEnlilSimple } from '../../features/donki/formatters';
import { config } from '../../app/config';
import { logger } from '../../shared/logger';

interface LastCheckedEvents {
  cme: Set<string>; // activityID
  notifications: Set<string>; // messageID
  wsaenlil: Set<number>; // simulationID
}

export class DonkiNotificationsService {
  private telegram: Telegram;
  private lastCheckedEvents: LastCheckedEvents;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Интервал проверки берется из конфигурации
  private readonly CHECK_INTERVAL_MS = config.donki.checkIntervalMs;

  constructor(telegram: Telegram) {
    this.telegram = telegram;
    this.lastCheckedEvents = {
      cme: new Set(),
      notifications: new Set(),
      wsaenlil: new Set(),
    };
  }

  /**
   * Запускает периодическую проверку новых событий
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('DonkiNotificationsService уже запущен');
      return;
    }

    this.isRunning = true;
    logger.info('Запуск сервиса уведомлений DONKI...');

    // Первая проверка сразу при запуске
    try {
      await this.checkNewEvents();
    } catch (error) {
      logger.error('Ошибка при первой проверке событий', error);
    }

    // Затем периодические проверки
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkNewEvents();
      } catch (error) {
        logger.error('Ошибка при проверке новых событий', error);
      }
    }, this.CHECK_INTERVAL_MS);

    logger.info('Сервис уведомлений DONKI запущен', {
      intervalMinutes: this.CHECK_INTERVAL_MS / 1000 / 60,
    });
  }

  /**
   * Останавливает периодическую проверку
   */
  public stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('Сервис уведомлений DONKI остановлен');
  }

  /**
   * Проверяет новые события и отправляет уведомления подписчикам
   */
  private async checkNewEvents() {
    try {
      logger.debug('Проверка новых событий DONKI начата');

      // Проверяем события за последние 24 часа
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);

      // Проверяем CME события
      await this.checkCMEEvents(startDate, endDate);

      // Проверяем уведомления
      await this.checkNotificationEvents(startDate, endDate);

      // Проверяем симуляции WSA-ENLIL
      await this.checkWSAEnlilEvents(startDate, endDate);

      logger.debug('Проверка новых событий DONKI завершена');
    } catch (error) {
      logger.error('Ошибка при проверке новых событий', error);
    }
  }

  /**
   * Проверяет новые CME события
   */
  private async checkCMEEvents(startDate: Date, endDate: Date) {
    try {
      const cmes = await container.donkiApi.getCMEs(startDate, endDate);

      for (const cme of cmes) {
        // Пропускаем, если уже проверяли это событие
        if (this.lastCheckedEvents.cme.has(cme.activityID)) {
          continue;
        }

        // Определяем уровень события
        const alertLevel = this.getCMEAlertLevel(cme);
        if (!alertLevel) {
          continue;
        }

        // Получаем подписчиков для этого уровня и выше
        const subscribers = await subscriptionsRepository.getSubscribersForLevel('cme', alertLevel);

        if (subscribers.length > 0) {
          const message = `🔔 <b>Новое событие CME</b>\n\n${formatCMESimple(cme)}`;

          // Отправляем уведомления всем подписчикам
          await this.sendNotifications(subscribers, message);
          logger.info('Отправлены уведомления о CME событии', {
            count: subscribers.length,
            activityId: cme.activityID,
          });
        }

        // Сохраняем ID события как проверенное
        this.lastCheckedEvents.cme.add(cme.activityID);
      }
    } catch (error) {
      logger.error('Ошибка при проверке CME событий', error);
    }
  }

  /**
   * Проверяет новые уведомления DONKI
   */
  private async checkNotificationEvents(startDate: Date, endDate: Date) {
    try {
      const notifications = await container.donkiApi.getNotifications(startDate, endDate);

      for (const notification of notifications) {
        // Пропускаем, если уже проверяли это уведомление
        if (this.lastCheckedEvents.notifications.has(notification.messageID)) {
          continue;
        }

        // Получаем всех подписчиков на уведомления
        const subscribers = await subscriptionsRepository.getSubscribers('notifications', 'enabled');

        if (subscribers.length > 0) {
          const message = `🔔 <b>Новое уведомление DONKI</b>\n\n${formatNotificationSimple(notification)}`;

          // Отправляем уведомления всем подписчикам
          await this.sendNotifications(subscribers, message);
          logger.info('Отправлены уведомления DONKI notification', {
            count: subscribers.length,
            messageId: notification.messageID,
          });
        }

        // Сохраняем ID уведомления как проверенное
        this.lastCheckedEvents.notifications.add(notification.messageID);
      }
    } catch (error) {
      logger.error('Ошибка при проверке уведомлений DONKI', error);
    }
  }

  /**
   * Проверяет новые симуляции WSA-ENLIL
   */
  private async checkWSAEnlilEvents(startDate: Date, endDate: Date) {
    try {
      const simulations = await container.donkiApi.getWSAEnlilSimulations(startDate, endDate);

      for (const sim of simulations) {
        // Пропускаем, если уже проверяли эту симуляцию
        if (this.lastCheckedEvents.wsaenlil.has(sim.simulationID)) {
          continue;
        }

        // Получаем всех подписчиков на симуляции WSA-ENLIL
        const subscribers = await subscriptionsRepository.getSubscribers('wsaenlil', 'enabled');

        if (subscribers.length > 0) {
          const message = `🔔 <b>Новая симуляция WSA-ENLIL</b>\n\n${formatWSAEnlilSimple(sim)}`;

          // Отправляем уведомления всем подписчикам
          await this.sendNotifications(subscribers, message);
          logger.info('Отправлены уведомления о симуляции WSA-ENLIL', {
            count: subscribers.length,
            simulationId: sim.simulationID,
          });
        }

        // Сохраняем ID симуляции как проверенное
        this.lastCheckedEvents.wsaenlil.add(sim.simulationID);
      }
    } catch (error) {
      logger.error('Ошибка при проверке симуляций WSA-ENLIL', error);
    }
  }

  /**
   * Определяет уровень CME события на основе скорости
   */
  private getCMEAlertLevel(cme: DonkiCME): CMEAlertLevel | null {
    const speed = cme.cmeAnalyses?.[0]?.speed;
    if (speed === undefined) return null;
    
    if (speed >= 1000) return 'extreme';
    if (speed >= 700) return 'high';
    return 'all';
  }

  /**
   * Отправляет уведомления списку пользователей
   */
  private async sendNotifications(userIds: number[], message: string) {
    const promises = userIds.map(async (userId) => {
      try {
        await this.telegram.sendMessage(userId, message, {
          parse_mode: 'HTML',
        });
      } catch (error: unknown) {
        // Обрабатываем ошибки, связанные с блокировкой бота пользователем
        if (this.isBotBlockedError(error)) {
          logger.warn('Пользователь заблокировал бота, отключаем подписки', { userId });
          // Отключаем все подписки пользователя
          try {
            const subscriptions = await subscriptionsRepository.getUserSubscriptions(userId);
            for (const sub of subscriptions) {
              await subscriptionsRepository.setSubscription(userId, sub.eventType as EventType, null);
            }
            logger.info('Подписки пользователя отключены из-за блокировки бота', { userId });
          } catch (disableError) {
            logger.error('Ошибка при отключении подписок пользователя', disableError, { userId });
          }
        } else {
          logger.error('Ошибка при отправке уведомления пользователю', error, { userId });
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Проверяет, является ли ошибка ошибкой блокировки бота (403)
   */
  private isBotBlockedError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'response' in error) {
      const telegramError = error as { response?: { error_code?: number } };
      return telegramError.response?.error_code === 403;
    }
    return false;
  }

  /**
   * Очищает историю проверенных событий (можно вызывать периодически для экономии памяти)
   */
  public clearOldEvents() {
    // Оставляем только события за последние 7 дней
    // В реальном приложении можно добавить более сложную логику очистки
    const maxSize = 1000;
    
    if (this.lastCheckedEvents.cme.size > maxSize) {
      this.lastCheckedEvents.cme.clear();
    }
    if (this.lastCheckedEvents.notifications.size > maxSize) {
      this.lastCheckedEvents.notifications.clear();
    }
    if (this.lastCheckedEvents.wsaenlil.size > maxSize) {
      this.lastCheckedEvents.wsaenlil.clear();
    }
  }
}

