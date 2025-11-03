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