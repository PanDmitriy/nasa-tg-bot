import { Telegraf } from 'telegraf';
import { config } from '../../app/config';
import { BotContext, UserSession } from './types';
import { handleTelegramError } from '../../shared/lib/errorHandler/errorHandler';
import { logger } from '../../shared/logger';
import { rateLimitMiddleware } from '../../shared/lib/rateLimiter';
import { handleStart } from './handlers/start';
import { handleAPOD, handleApodFull, handleApodRandom } from './handlers/apod';
import { handleEarth, handleEarthRetry, handleEarthType } from './handlers/earth';
import { handleAsteroids } from './handlers/asteroids';
// removed Mars feature: handlers are no longer used
import {
  handleHelp,
  handleHelpApod,
  handleHelpEarth,
  handleHelpAsteroids,
  handleHelpImages,
  handleHelpDonki,
  handleHelpSubscriptions,
  handleHelpGeneral,
} from './handlers/help';
import { handleMainMenu } from './handlers/main-menu';
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
} from './handlers/subscriptions/subscribe';
import {
  handleUnsubscribe,
  handleUnsubscribeItem,
  handleUnsubscribeClose,
} from './handlers/subscriptions/unsubscribe';
import {
  handlePremium,
  handlePremiumClose,
} from '../../features/payments/commands.premium';

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
      logger.info('Очищено устаревших сессий', { cleanedCount });
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

  private registerAction(
    trigger: string | RegExp,
    handler: (ctx: BotContext) => Promise<void> | void,
    actionName: string,
  ): void {
    this.bot.action(trigger, async (ctx) => {
      try {
        await handler(ctx);
      } catch (error) {
        await handleTelegramError(ctx, error, actionName);
      }
    });
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
    this.bot.command('unsubscribe', handleUnsubscribe);
    this.bot.command('premium', handlePremium);

    // Earth actions
    this.registerAction('earth_retry', handleEarthRetry, 'EarthRetry');
    this.registerAction('earth_type_natural', handleEarthType, 'EarthTypeNatural');
    this.registerAction('earth_type_enhanced', handleEarthType, 'EarthTypeEnhanced');

    // Images actions
    this.registerAction(/^images_topic_/, handleImageTopic, 'ImagesTopic');
    this.registerAction('images_prev', handleImagePrev, 'ImagesPrev');
    this.registerAction('images_next', handleImageNext, 'ImagesNext');
    this.registerAction('images_menu', handleImagesMenu, 'ImagesMenu');
    this.registerAction('images_custom_search', handleImagesCustomSearch, 'ImagesCustomSearch');
    this.registerAction('images_info', handleImageInfo, 'ImagesInfo');

    // DONKI actions
    this.registerAction('donki_menu', handleDonkiMenu, 'DonkiMenu');
    this.registerAction('donki_cme', handleDonkiCME, 'DonkiCME');
    this.registerAction('donki_flares', handleDonkiFlares, 'DonkiFlares');
    this.registerAction('donki_sep', handleDonkiSEP, 'DonkiSEP');
    this.registerAction('donki_gst', handleDonkiGST, 'DonkiGST');
    this.registerAction('donki_ips', handleDonkiIPS, 'DonkiIPS');
    this.registerAction('donki_notifications', handleDonkiNotifications, 'DonkiNotifications');
    this.registerAction('donki_wsaenlil', handleDonkiWSAEnlil, 'DonkiWSAEnlil');
    this.registerAction('donki_close', handleDonkiClose, 'DonkiClose');

    // DONKI date selections
    this.registerAction(/^donki_cme_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiCMEData(ctx, days);
      }
    }, 'DonkiCMEData');

    this.registerAction(/^donki_sep_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiSEPData(ctx, days);
      }
    }, 'DonkiSEPData');

    this.registerAction(/^donki_gst_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiGSTData(ctx, days);
      }
    }, 'DonkiGSTData');

    this.registerAction(/^donki_ips_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiIPSData(ctx, days);
      }
    }, 'DonkiIPSData');

    // DONKI flares period selection
    this.registerAction(/^donki_flares_(today|week|month|7days)$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const period = ctx.callbackQuery.data.split('_').pop();
        const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
        await handleDonkiFlaresPeriod(ctx, days);
      }
    }, 'DonkiFlaresPeriod');

    // DONKI flare class selection
    this.registerAction(/^donki_flares_class_/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        const classType = ctx.callbackQuery.data.split('_').pop() || 'ALL';
        await handleDonkiFlaresData(ctx, classType);
      }
    }, 'DonkiFlaresClass');

    // DONKI item navigation
    this.registerAction(/^donki_\w+_item_\d+$/, async (ctx) => {
      if ('data' in ctx.callbackQuery && ctx.callbackQuery.data) {
        await handleDonkiItemNavigation(ctx, ctx.callbackQuery.data);
      }
    }, 'DonkiItemNavigation');

    // DONKI mode toggle
    this.registerAction('donki_toggle_mode', handleDonkiToggleMode, 'DonkiToggleMode');
    this.registerAction('donki_set_mode', handleDonkiSetMode, 'DonkiSetMode');

    // DONKI subscriptions
    this.registerAction('donki_subscriptions', handleDonkiSubscriptions, 'DonkiSubscriptions');
    this.registerAction('donki_sub_cme_menu', handleDonkiCMESubscriptionMenu, 'DonkiCMESubscriptionMenu');
    this.registerAction('donki_sub_cme_extreme', async (ctx) => {
      await handleDonkiCMESubscription(ctx, 'extreme');
    }, 'DonkiCMESubscriptionExtreme');
    this.registerAction('donki_sub_cme_high', async (ctx) => {
      await handleDonkiCMESubscription(ctx, 'high');
    }, 'DonkiCMESubscriptionHigh');
    this.registerAction('donki_sub_cme_all', async (ctx) => {
      await handleDonkiCMESubscription(ctx, 'all');
    }, 'DonkiCMESubscriptionAll');
    this.registerAction('donki_sub_cme_none', async (ctx) => {
      await handleDonkiCMESubscription(ctx, null);
    }, 'DonkiCMESubscriptionNone');
    this.registerAction('donki_sub_notifications_toggle', handleDonkiNotificationsSubscription, 'DonkiNotificationsToggle');
    this.registerAction('donki_sub_wsaenlil_toggle', handleDonkiWSAEnlilSubscription, 'DonkiWSAEnlilToggle');

    // Subscribe actions
    this.registerAction(/^subscribe_type_(apod|earth|donki)$/, handleSubscribeType, 'SubscribeType');
    this.registerAction(/^subscribe_time_\d+$/, handleSubscribeTime, 'SubscribeTime');
    this.registerAction('subscribe_confirm', handleSubscribeConfirm, 'SubscribeConfirm');
    this.registerAction('subscribe_cancel', handleSubscribeCancel, 'SubscribeCancel');
    this.registerAction('subscribe_close', handleSubscribeClose, 'SubscribeClose');

    // Unsubscribe actions
    this.registerAction(/^unsubscribe_\d+$/, handleUnsubscribeItem, 'UnsubscribeItem');
    this.registerAction('unsubscribe_close', handleUnsubscribeClose, 'UnsubscribeClose');

    // Premium actions
    this.registerAction('premium_close', handlePremiumClose, 'PremiumClose');

    // APOD actions
    this.registerAction(/^apod_full_/, handleApodFull, 'ApodFull');
    this.registerAction('apod_random', handleApodRandom, 'ApodRandom');

    // Main menu and quick actions
    this.registerAction('main_menu', handleMainMenu, 'MainMenu');
    this.registerAction('quick_apod', handleAPOD, 'QuickApod');
    this.registerAction('quick_earth', handleEarth, 'QuickEarth');
    this.registerAction('quick_asteroids', handleAsteroids, 'QuickAsteroids');
    this.registerAction('quick_images', handleImages, 'QuickImages');
    this.registerAction('quick_donki', handleDonki, 'QuickDonki');
    this.registerAction('quick_subscribe', handleSubscribe, 'QuickSubscribe');
    this.registerAction('help_menu', handleHelp, 'HelpMenu');
    this.registerAction('help_apod', handleHelpApod, 'HelpApod');
    this.registerAction('help_earth', handleHelpEarth, 'HelpEarth');
    this.registerAction('help_asteroids', handleHelpAsteroids, 'HelpAsteroids');
    this.registerAction('help_images', handleHelpImages, 'HelpImages');
    this.registerAction('help_donki', handleHelpDonki, 'HelpDonki');
    this.registerAction('help_subscriptions', handleHelpSubscriptions, 'HelpSubscriptions');
    this.registerAction('help_general', handleHelpGeneral, 'HelpGeneral');
    this.registerAction('settings_menu', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await ctx.reply('⚙️ <b>Настройки</b>\n\nФункция настроек находится в разработке.', { parse_mode: 'HTML' });
      } catch (error) {
        await handleTelegramError(ctx, error, 'SettingsMenu');
      }
    }, 'SettingsMenu');

    // Обработка текстового ввода времени для подписки
    this.bot.on('text', handleSubscribeTimeInput);
  }

  public async start() {
    await this.bot.launch();
    logger.info('Bot started');
  }

  public async stop() {
    this.stopSessionCleanup();
    await this.bot.stop();
    logger.info('Bot stopped');
  }

  public getTelegram() {
    return this.bot.telegram;
  }
} 