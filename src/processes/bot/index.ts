import { Telegraf } from 'telegraf';
import { config } from '../../app/config';
import { BotContext, UserSession } from './types';
import { handleTelegramError } from '../../shared/lib/errorHandler/errorHandler';
import { rateLimitMiddleware } from '../../shared/lib/rateLimiter';
import { handleStart } from './handlers/start';
import { handleAPOD } from './handlers/apod';
import { handleEarth, handleEarthRetry, handleEarthType } from './handlers/earth';
import { handleAsteroids } from './handlers/asteroids';
// removed Mars feature: handlers are no longer used
import { handleHelp } from './handlers/help';
import {
  handleImages,
  handleImageTopic,
  handleImagePrev,
  handleImageNext,
  handleImagesMenu,
  handleImagesCustomSearch,
  handleImageInfo,
} from './handlers/images';
import {
  handleDonki,
  handleDonkiMenu,
  handleDonkiCME,
  handleDonkiCMEData,
  handleDonkiFlares,
  handleDonkiFlaresPeriod,
  handleDonkiFlaresData,
  handleDonkiSEP,
  handleDonkiSEPData,
  handleDonkiGST,
  handleDonkiGSTData,
  handleDonkiIPS,
  handleDonkiIPSData,
  handleDonkiNotifications,
  handleDonkiWSAEnlil,
  handleDonkiClose,
  handleDonkiItemNavigation,
  handleDonkiToggleMode,
  handleDonkiSetMode,
  handleDonkiSubscriptions,
  handleDonkiCMESubscriptionMenu,
  handleDonkiCMESubscription,
  handleDonkiNotificationsSubscription,
  handleDonkiWSAEnlilSubscription,
} from './handlers/donki';
import {
  handleSubscribe,
  handleSubscribeType,
  handleSubscribeTime,
  handleSubscribeConfirm,
  handleSubscribeCancel,
  handleSubscribeClose,
  handleSubscribeTimeInput,
} from '../../features/subscriptions/commands.subscribe';

export class Bot {
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, { session: UserSession; lastAccess: Date }>;
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 минут

  constructor() {
    this.bot = new Telegraf<BotContext>(config.bot.token);
    this.sessions = new Map();
    this.setupMiddleware();
    this.setupCommands();
    this.startSessionCleanup();
  }

  private setupMiddleware() {
    // Middleware для rate limiting (должен быть первым)
    this.bot.use(rateLimitMiddleware());

    // Middleware для обработки ошибок
    this.bot.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        await handleTelegramError(ctx, error, 'Bot Middleware');
      }
    });

    // Middleware для управления сессиями
    this.bot.use((ctx, next) => {
      const chatId = ctx.chat?.id;
      if (chatId) {
        const sessionData = this.sessions.get(chatId);
        if (sessionData) {
          sessionData.lastAccess = new Date();
          ctx.session = sessionData.session;
        } else {
          const newSession: UserSession = {};
          this.sessions.set(chatId, { session: newSession, lastAccess: new Date() });
          ctx.session = newSession;
        }
      }
      return next();
    });
  }

  /**
   * Очищает старые сессии для предотвращения утечек памяти
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, data] of this.sessions.entries()) {
      if (now - data.lastAccess.getTime() > this.SESSION_TTL_MS) {
        this.sessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Очищено ${cleanedCount} устаревших сессий`);
    }
  }

  /**
   * Запускает периодическую очистку старых сессий
   */
  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Останавливает очистку сессий
   */
  private stopSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  private setupCommands() {
    this.bot.telegram.setMyCommands(config.bot.commands);

    this.bot.command('start', handleStart);
    this.bot.command('apod', handleAPOD);
    this.bot.command('earth', handleEarth);
    this.bot.command('asteroids', handleAsteroids);
    this.bot.command('images', handleImages);
    this.bot.command('donki', handleDonki);
    this.bot.command('help', handleHelp);
    this.bot.command('subscribe', handleSubscribe);

    // Earth actions
    this.bot.action('earth_retry', handleEarthRetry);
    this.bot.action('earth_type_natural', handleEarthType);
    this.bot.action('earth_type_enhanced', handleEarthType);

    // Images actions
    this.bot.action(/^images_topic_/, handleImageTopic);
    this.bot.action('images_prev', handleImagePrev);
    this.bot.action('images_next', handleImageNext);
    this.bot.action('images_menu', handleImagesMenu);
    this.bot.action('images_custom_search', handleImagesCustomSearch);
    this.bot.action('images_info', handleImageInfo);

    // DONKI actions
    this.bot.action('donki_menu', handleDonkiMenu);
    this.bot.action('donki_cme', handleDonkiCME);
    this.bot.action('donki_flares', handleDonkiFlares);
    this.bot.action('donki_sep', handleDonkiSEP);
    this.bot.action('donki_gst', handleDonkiGST);
    this.bot.action('donki_ips', handleDonkiIPS);
    this.bot.action('donki_notifications', handleDonkiNotifications);
    this.bot.action('donki_wsaenlil', handleDonkiWSAEnlil);
    this.bot.action('donki_close', handleDonkiClose);

    // DONKI date selections
    this.bot.action(/^donki_cme_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiCMEData(ctx as BotContext, days);
      }
    });
    
    this.bot.action(/^donki_sep_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiSEPData(ctx as BotContext, days);
      }
    });
    
    this.bot.action(/^donki_gst_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiGSTData(ctx as BotContext, days);
      }
    });
    
    this.bot.action(/^donki_ips_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiIPSData(ctx as BotContext, days);
      }
    });

    // DONKI flares period selection
    this.bot.action(/^donki_flares_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiFlaresPeriod(ctx as BotContext, days);
      }
    });

    // DONKI flare class selection
    this.bot.action(/^donki_flares_class_/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        const classType = ctx.callbackQuery.data.split('_').pop() || 'ALL';
        await handleDonkiFlaresData(ctx as BotContext, classType);
      }
    });

    // DONKI item navigation
    this.bot.action(/^donki_\w+_item_\d+$/, async (ctx) => {
      if ('data' in ctx.callbackQuery) {
        await handleDonkiItemNavigation(ctx as BotContext, ctx.callbackQuery.data);
      }
    });

    // DONKI mode toggle
    this.bot.action('donki_toggle_mode', handleDonkiToggleMode);
    this.bot.action('donki_set_mode', handleDonkiSetMode);

    // DONKI subscriptions
    this.bot.action('donki_subscriptions', handleDonkiSubscriptions);
    this.bot.action('donki_sub_cme_menu', handleDonkiCMESubscriptionMenu);
    this.bot.action('donki_sub_cme_extreme', async (ctx) => {
      await handleDonkiCMESubscription(ctx as BotContext, 'extreme');
    });
    this.bot.action('donki_sub_cme_high', async (ctx) => {
      await handleDonkiCMESubscription(ctx as BotContext, 'high');
    });
    this.bot.action('donki_sub_cme_all', async (ctx) => {
      await handleDonkiCMESubscription(ctx as BotContext, 'all');
    });
    this.bot.action('donki_sub_cme_none', async (ctx) => {
      await handleDonkiCMESubscription(ctx as BotContext, null);
    });
    this.bot.action('donki_sub_notifications_toggle', handleDonkiNotificationsSubscription);
    this.bot.action('donki_sub_wsaenlil_toggle', handleDonkiWSAEnlilSubscription);

    // Subscribe actions
    this.bot.action(/^subscribe_type_(apod|earth|donki)$/, handleSubscribeType);
    this.bot.action(/^subscribe_time_\d+$/, handleSubscribeTime);
    this.bot.action('subscribe_confirm', handleSubscribeConfirm);
    this.bot.action('subscribe_cancel', handleSubscribeCancel);
    this.bot.action('subscribe_close', handleSubscribeClose);

    // Обработка текстового ввода времени для подписки
    this.bot.on('text', handleSubscribeTimeInput);
  }

  public async start() {
    await this.bot.launch();
    console.log('Bot started');
  }

  public async stop() {
    this.stopSessionCleanup();
    await this.bot.stop();
    console.log('Bot stopped');
  }

  public getTelegram() {
    return this.bot.telegram;
  }
} 