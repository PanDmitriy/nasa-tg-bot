import { Context } from 'telegraf';
import { NasaImage } from '../../features/images/api';

export interface UserSession {
  images?: {
    currentImages?: NasaImage[];
    currentIndex?: number;
    currentQuery?: string;
  };
}

export interface BotContext extends Context {
  session?: UserSession;
} 