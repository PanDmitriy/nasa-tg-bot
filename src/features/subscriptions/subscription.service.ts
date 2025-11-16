import { subscriptionRepository } from '../../shared/db/repositories/subscription.repository';

export type SubscriptionType = 'apod' | 'earth' | 'donki';

export interface CreateSubscriptionParams {
  telegramId: string;
  chatId: string;
  type: SubscriptionType;
  hourUtc: number;
  params?: import('../../entities/subscription/types').SubscriptionParams;
}

export class SubscriptionService {
  /**
   * Создает новую подписку
   */
  async create(params: CreateSubscriptionParams) {
    return await subscriptionRepository.create(params);
  }

  /**
   * Получает все подписки для конкретного чата
   */
  async getByChat(chatId: string) {
    return await subscriptionRepository.findByChat(chatId);
  }

  /**
   * Получает все активные подписки (enabled = true)
   */
  async listAllEnabled() {
    return await subscriptionRepository.findEnabled();
  }

  /**
   * Переключает статус подписки (enabled/disabled)
   */
  async toggle(id: number) {
    return await subscriptionRepository.toggle(id);
  }

  /**
   * Удаляет подписку
   */
  async delete(id: number) {
    return await subscriptionRepository.delete(id);
  }

  /**
   * Получает подписку по ID
   */
  async getById(id: number) {
    return await subscriptionRepository.findById(id);
  }

  /**
   * Отключает подписку (устанавливает enabled = false)
   * Проверяет, что подписка принадлежит указанному chatId
   */
  async disable(id: number, chatId: string) {
    return await subscriptionRepository.disable(id, chatId);
  }
}

