import { Context } from 'telegraf';
import { MarsPhoto } from '../../features/mars/api';

interface PhotoViewState {
  photos: MarsPhoto[];
  currentIndex: number;
  messageId?: number;
}

export interface UserSession {
  marsPhotos?: MarsPhoto[];
  currentPhotoIndex?: number;
  photoViewState?: PhotoViewState;
}

export interface BotContext extends Context {
  session?: UserSession;
} 