import { Telegraf } from 'telegraf';
import { config } from '../../app/config';
import { BotContext, UserSession } from './types';
import { handleStart } from './handlers/start';
import { handleAPOD } from './handlers/apod';
import { handleEarth, handleEarthRetry, handleEarthType } from './handlers/earth';
import { handleAsteroids } from './handlers/asteroids';
import { handleMars, handleMarsNavigation } from './handlers/mars';
import { handlePhotoNavigation } from './handlers/photoNavigation';
import { handleHelp } from './handlers/help';

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
    this.bot.command('mars', handleMars);
    this.bot.command('help', handleHelp);

    this.bot.action(/first_photo|prev_photo|next_photo|last_photo|close_photos|photo_info/, handlePhotoNavigation);
    this.bot.action('earth_retry', handleEarthRetry);
    this.bot.action('earth_type_natural', handleEarthType);
    this.bot.action('earth_type_enhanced', handleEarthType);
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