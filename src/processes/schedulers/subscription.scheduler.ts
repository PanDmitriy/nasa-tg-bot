import * as cron from 'node-cron';
import { Telegram } from 'telegraf';
import { container } from '../../shared/di/container';
import { prisma } from '../../shared/db/prisma';
import { SubscriptionParams, EarthSubscriptionParams, DonkiSubscriptionParams } from '../../entities/subscription/types';
import { logger } from '../../shared/logger';

export class SubscriptionScheduler {
  private telegram: Telegram;
  private subscriptionService = container.subscriptionService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(telegram: Telegram) {
    this.telegram = telegram;
  }

  /**
   * Запускает cron-процесс для отправки уведомлений
   * Запускается каждый час (0 * * * *)
   */
  public start() {
    if (this.isRunning) {
      logger.info('SubscriptionScheduler уже запущен');
      return;
    }

    this.isRunning = true;
    logger.info('Запуск scheduler подписок');

    // Запускаем cron каждую минуту для тестирования, или каждый час: '0 * * * *'
    // Для продакшена используем '0 * * * *' (каждый час в 0 минут)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.processSubscriptions();
    });

    // Первая проверка сразу при запуске (опционально, для тестирования)
    // await this.processSubscriptions();

    logger.info('SubscriptionScheduler запущен', { schedule: '0 * * * *' });
  }

  /**
   * Останавливает cron-процесс
   */
  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('SubscriptionScheduler остановлен');
  }

  /**
   * Обрабатывает все подписки для текущего часа UTC
   */
  private async processSubscriptions() {
    try {
      const currentHourUtc = new Date().getUTCHours();
      logger.debug('Проверка подписок для текущего часа', { currentHourUtc });

      // Получаем все активные подписки
      const allSubscriptions = await this.subscriptionService.listAllEnabled();

      // Фильтруем подписки по текущему часу UTC
      const subscriptionsForCurrentHour = allSubscriptions.filter(
        (sub) => sub.hourUtc === currentHourUtc
      );

      logger.debug('Количество подписок к отправке', {
        currentHourUtc,
        count: subscriptionsForCurrentHour.length,
      });

      // Обрабатываем каждую подписку
      for (const subscription of subscriptionsForCurrentHour) {
        // Проверяем и приводим тип подписки к литеральному типу
        if (subscription.type !== 'apod' && subscription.type !== 'earth' && subscription.type !== 'donki') {
          logger.warn('Пропущена подписка с недопустимым типом', {
            subscriptionId: subscription.id,
            type: subscription.type,
          });
          continue;
        }
        await this.sendSubscriptionNotification({
          id: subscription.id,
          telegramId: subscription.telegramId,
          chatId: subscription.chatId,
          type: subscription.type as 'apod' | 'earth' | 'donki',
          params: subscription.params as SubscriptionParams,
        });
      }
    } catch (error) {
      logger.error('SubscriptionScheduler: ошибка при обработке подписок', error);
    }
  }

  /**
   * Отправляет уведомление для конкретной подписки
   */
  private async sendSubscriptionNotification(subscription: {
    id: number;
    telegramId: string;
    chatId: string;
    type: 'apod' | 'earth' | 'donki';
    params: SubscriptionParams;
  }) {
    let status: 'sent' | 'failed' = 'sent';
    let error: string | null = null;
    let payload: { type: string } | null = null;

    try {
      logger.debug('Отправка уведомления для подписки', {
        subscriptionId: subscription.id,
        type: subscription.type,
      });

      switch (subscription.type) {
        case 'apod':
          await this.sendApodNotification(subscription);
          payload = { type: 'apod' };
          break;

        case 'earth':
          await this.sendEarthNotification(subscription);
          payload = { type: 'earth' };
          break;

        case 'donki':
          await this.sendDonkiNotification(subscription);
          payload = { type: 'donki' };
          break;

        default:
          throw new Error(`Неизвестный тип подписки: ${subscription.type}`);
      }

      logger.info('Уведомление успешно отправлено', {
        subscriptionId: subscription.id,
        type: subscription.type,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('SubscriptionScheduler: ошибка при отправке уведомления', err, {
        subscriptionId: subscription.id,
        type: subscription.type,
      });
    } finally {
      // Логируем результат в NotificationLog
      await this.logNotification(subscription, status, payload, error);
    }
  }

  /**
   * Отправляет APOD уведомление
   */
  private async sendApodNotification(subscription: {
    id: number;
    chatId: string;
  }) {
    try {
      const apod = await container.apodService.getRandomApod();

      if (apod.media_type === 'image') {
        const caption = container.apodService.formatApodAsImage(apod);
        await this.telegram.sendPhoto(subscription.chatId, apod.url, {
          caption,
          parse_mode: 'HTML',
        });
      } else {
        const text = container.apodService.formatApodAsText(apod);
        await this.telegram.sendMessage(subscription.chatId, text, {
          parse_mode: 'HTML',
        });
      }
    } catch (error: unknown) {
      if (this.isBotBlockedError(error)) {
        await this.subscriptionService.disable(subscription.id, subscription.chatId);
        logger.info(`Подписка ${subscription.id} отключена: пользователь заблокировал бота`, {
          subscriptionId: subscription.id,
          chatId: subscription.chatId,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Отправляет Earth уведомление
   */
  private async sendEarthNotification(subscription: {
    id: number;
    chatId: string;
    params: SubscriptionParams;
  }) {
    try {
      // Получаем тип из params или используем 'natural' по умолчанию
      const earthParams = subscription.params as EarthSubscriptionParams | null;
      const type = earthParams?.type || 'natural';
      const image = await container.earthApi.getLatestEarthImageWithFallback(
        type as 'natural' | 'enhanced'
      );

      const caption =
        `🌍 <b>Снимок Земли${image.isFallback ? ' — последняя доступная дата' : ''}</b>\n\n` +
        `📅 <i>${new Date(image.date).toLocaleString('ru-RU')}</i>\n\n` +
        `${image.caption}\n\n` +
        `📸 <i>NASA Earth Polychromatic Imaging Camera (EPIC)</i>`;

      await this.telegram.sendPhoto(subscription.chatId, image.image, {
        caption,
        parse_mode: 'HTML',
      });
    } catch (error: unknown) {
      if (this.isBotBlockedError(error)) {
        await this.subscriptionService.disable(subscription.id, subscription.chatId);
        logger.info(`Подписка ${subscription.id} отключена: пользователь заблокировал бота`, {
          subscriptionId: subscription.id,
          chatId: subscription.chatId,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Отправляет DONKI уведомление
   */
  private async sendDonkiNotification(subscription: {
    id: number;
    chatId: string;
    params: SubscriptionParams;
  }) {
    try {
      // Получаем последние события DONKI за последние 24 часа
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);

      // Получаем тип события из params или используем CME по умолчанию
      const donkiParams = subscription.params as DonkiSubscriptionParams | null;
      const eventType = donkiParams?.eventType || 'cme';

      let message = '';

      switch (eventType) {
        case 'cme':
          const cmeEvents = await container.donkiApi.getCMEs(startDate, endDate);
          if (cmeEvents.length > 0) {
            const latest = cmeEvents[0];
            message =
              `🌊 <b>Новое событие CME</b>\n\n` +
              `🆔 ID: ${latest.activityID}\n` +
              `📅 Время: ${new Date(latest.startTime).toLocaleString('ru-RU')}\n` +
              `📍 Локация: ${latest.sourceLocation}\n` +
              `${latest.note ? `📝 ${latest.note}\n` : ''}` +
              `${latest.link ? `🔗 <a href="${latest.link}">Подробнее</a>` : ''}`;
          } else {
            message = '🌊 <b>События CME</b>\n\nЗа последние 24 часа новых событий не обнаружено.';
          }
          break;

        case 'notifications':
          const notifications = await container.donkiApi.getNotifications(startDate, endDate);
          if (notifications.length > 0) {
            const latest = notifications[0];
            message =
              `🔔 <b>Новое уведомление DONKI</b>\n\n` +
              `📅 Время: ${new Date(latest.messageIssueTime).toLocaleString('ru-RU')}\n` +
              `📝 ${latest.messageBody}\n` +
              `${latest.messageURL ? `🔗 <a href="${latest.messageURL}">Подробнее</a>` : ''}`;
          } else {
            message =
              '🔔 <b>Уведомления DONKI</b>\n\nЗа последние 24 часа новых уведомлений не обнаружено.';
          }
          break;

        default:
          message = `🌊 <b>DONKI события</b>\n\nТип события "${eventType}" пока не поддерживается.`;
      }

      if (message) {
        await this.telegram.sendMessage(subscription.chatId, message, {
          parse_mode: 'HTML',
        });
      }
    } catch (error: unknown) {
      if (this.isBotBlockedError(error)) {
        await this.subscriptionService.disable(subscription.id, subscription.chatId);
        logger.info(`Подписка ${subscription.id} отключена: пользователь заблокировал бота`, {
          subscriptionId: subscription.id,
          chatId: subscription.chatId,
        });
        return;
      }
      throw error;
    }
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
   * Логирует результат отправки уведомления в NotificationLog
   */
  private async logNotification(
    subscription: {
      id: number;
      telegramId: string;
      chatId: string;
      type: 'apod' | 'earth' | 'donki';
    },
    status: 'sent' | 'failed',
    payload: { type: string } | null,
    error: string | null
  ) {
    try {
      await prisma.notificationLog.create({
        data: {
          subscriptionId: subscription.id,
          telegramId: subscription.telegramId,
          chatId: subscription.chatId,
          type: subscription.type,
          status,
          payload: payload ?? undefined,
          error: error ?? undefined,
        },
      });
    } catch (err) {
      logger.error('SubscriptionScheduler: ошибка при логировании уведомления', err, {
        subscriptionId: subscription.id,
      });
    }
  }
}

