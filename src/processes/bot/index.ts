import { Telegraf } from 'telegraf';
import { config } from '../../app/config';
import { BotContext, UserSession } from './types';
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
} from './handlers/donki';

export class Bot {
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, UserSession>;

  constructor() {
    this.bot = new Telegraf<BotContext>(config.bot.token);
    this.sessions = new Map();
    this.setupMiddleware();
    this.setupCommands();
  }

  private setupMiddleware() {
    this.bot.use((ctx, next) => {
      const chatId = ctx.chat?.id;
      if (chatId) {
        if (!this.sessions.has(chatId)) {
          this.sessions.set(chatId, {});
        }
        ctx.session = this.sessions.get(chatId);
      }
      return next();
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
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiCMEData(ctx as BotContext, days);
    });
    
    this.bot.action(/^donki_sep_(today|week|month|7days)$/, async (ctx) => {
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiSEPData(ctx as BotContext, days);
    });
    
    this.bot.action(/^donki_gst_(today|week|month|7days)$/, async (ctx) => {
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiGSTData(ctx as BotContext, days);
    });
    
    this.bot.action(/^donki_ips_(today|week|month|7days)$/, async (ctx) => {
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiIPSData(ctx as BotContext, days);
    });

    // DONKI flares period selection
    this.bot.action(/^donki_flares_(today|week|month|7days)$/, async (ctx) => {
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiFlaresPeriod(ctx as BotContext, days);
    });

    // DONKI flare class selection
    this.bot.action(/^donki_flares_class_/, async (ctx) => {
      const classType = ctx.callbackQuery.data.split('_').pop() || 'ALL';
      await handleDonkiFlaresData(ctx as BotContext, classType);
    });

    // DONKI item navigation
    this.bot.action(/^donki_\w+_item_\d+$/, async (ctx) => {
      await handleDonkiItemNavigation(ctx as BotContext, ctx.callbackQuery.data);
    });

    // DONKI mode toggle
    this.bot.action('donki_toggle_mode', handleDonkiToggleMode);
    this.bot.action('donki_set_mode', handleDonkiSetMode);
  }

  public async start() {
    await this.bot.launch();
    console.log('Bot started');
  }

  public async stop() {
    await this.bot.stop();
    console.log('Bot stopped');
  }
} 