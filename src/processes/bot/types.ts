import { Context } from 'telegraf';
import { MarsPhoto } from '../../features/mars/api';

export interface UserSession {
  marsPhotos?: MarsPhoto[];
  currentPhotoIndex?: number;
}

export interface BotContext extends Context {
  session?: UserSession;
} 