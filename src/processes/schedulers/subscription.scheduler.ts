import * as cron from 'node-cron';
import { Telegram } from 'telegraf';
import { SubscriptionService } from '../../features/subscriptions/subscription.service';
import { container } from '../../shared/di/container';
import { prisma } from '../../shared/db/prisma';
import { SubscriptionParams, EarthSubscriptionParams, DonkiSubscriptionParams } from '../../entities/subscription/types';

export class SubscriptionScheduler {
  private telegram: Telegram;
  private subscriptionService: SubscriptionService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(telegram: Telegram) {
    this.telegram = telegram;
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Запускает cron-процесс для отправки уведомлений
   * Запускается каждый час (0 * * * *)
   */
  public start() {
    if (this.isRunning) {
      console.log('SubscriptionScheduler уже запущен');
      return;
    }

    this.isRunning = true;
    console.log('Запуск scheduler подписок...');

    // Запускаем cron каждую минуту для тестирования, или каждый час: '0 * * * *'
    // Для продакшена используем '0 * * * *' (каждый час в 0 минут)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.processSubscriptions();
    });

    // Первая проверка сразу при запуске (опционально, для тестирования)
    // await this.processSubscriptions();

    console.log('SubscriptionScheduler запущен. Проверка каждый час в 0 минут.');
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
    console.log('SubscriptionScheduler остановлен');
  }

  /**
   * Обрабатывает все подписки для текущего часа UTC
   */
  private async processSubscriptions() {
    try {
      const currentHourUtc = new Date().getUTCHours();
      console.log(`[SubscriptionScheduler] Проверка подписок для часа ${currentHourUtc} UTC`);

      // Получаем все активные подписки
      const allSubscriptions = await this.subscriptionService.listAllEnabled();

      // Фильтруем подписки по текущему часу UTC
      const subscriptionsForCurrentHour = allSubscriptions.filter(
        (sub) => sub.hourUtc === currentHourUtc
      );

      console.log(
        `[SubscriptionScheduler] Найдено ${subscriptionsForCurrentHour.length} подписок для часа ${currentHourUtc} UTC`
      );

      // Обрабатываем каждую подписку
      for (const subscription of subscriptionsForCurrentHour) {
        await this.sendSubscriptionNotification(subscription);
      }
    } catch (error) {
      console.error('[SubscriptionScheduler] Ошибка при обработке подписок:', error);
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
      console.log(
        `[SubscriptionScheduler] Отправка уведомления для подписки ${subscription.id} (${subscription.type})`
      );

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

      console.log(
        `[SubscriptionScheduler] Уведомление успешно отправлено для подписки ${subscription.id}`
      );
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      console.error(
        `[SubscriptionScheduler] Ошибка при отправке уведомления для подписки ${subscription.id}:`,
        error
      );
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
  }

  /**
   * Отправляет Earth уведомление
   */
  private async sendEarthNotification(subscription: {
    id: number;
    chatId: string;
    params: SubscriptionParams;
  }) {
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
  }

  /**
   * Отправляет DONKI уведомление
   */
  private async sendDonkiNotification(subscription: {
    id: number;
    chatId: string;
    params: SubscriptionParams;
  }) {
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
      console.error('[SubscriptionScheduler] Ошибка при логировании уведомления:', err);
    }
  }
}

