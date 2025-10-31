import { Context } from 'telegraf';

export interface UserSession {
}

export interface BotContext extends Context {
  session?: UserSession;
} 