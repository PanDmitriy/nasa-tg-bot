import { Context } from 'telegraf';
import { NasaImage } from '../../features/images/api';
import {
  DonkiCME,
  DonkiFlare,
  DonkiSEP,
  DonkiGST,
  DonkiIPS,
  DonkiNotification,
  DonkiWSAEnlil,
} from '../../features/donki/api';

export type CMEAlertLevel = 'extreme' | 'high' | 'all';

export interface DonkiSubscriptions {
  cme?: CMEAlertLevel; // undefined = не подписан
}

export interface UserSession {
  images?: {
    currentImages?: NasaImage[];
    currentIndex?: number;
    currentQuery?: string;
  };
  donkiData?: {
    type: 'cme' | 'flares' | 'sep' | 'gst' | 'ips' | 'notifications' | 'wsaenlil';
    items: Array<DonkiCME | DonkiFlare | DonkiSEP | DonkiGST | DonkiIPS | DonkiNotification | DonkiWSAEnlil>;
    currentIndex: number;
  };
  donkiFlaresPeriod?: number;
  donkiSimpleMode?: boolean; // true = простой режим, false/undefined = подробный
  donkiSubscriptions?: DonkiSubscriptions;
}

export interface BotContext extends Context {
  session?: UserSession;
} 