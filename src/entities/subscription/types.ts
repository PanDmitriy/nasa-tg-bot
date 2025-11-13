export interface EarthSubscriptionParams {
  type: 'natural' | 'enhanced';
}

export interface DonkiSubscriptionParams {
  eventType: 'cme' | 'notifications' | 'wsaenlil';
  alertLevel?: 'extreme' | 'high' | 'all';
}

export type SubscriptionParams = EarthSubscriptionParams | DonkiSubscriptionParams | null;

export interface SubscriptionWithParams {
  id: number;
  telegramId: string;
  chatId: string;
  type: 'apod' | 'earth' | 'donki';
  params: SubscriptionParams;
  hourUtc: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

