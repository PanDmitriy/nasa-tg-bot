import { config } from '../../app/config';
import { ApodApi } from '../../features/apod/api';
import { ApodService } from '../../features/apod/services/apodService';
import { AsteroidsApi } from '../../features/asteroids/api';
import { AsteroidsService } from '../../features/asteroids/services/asteroidsService';
import { DonkiApi } from '../../features/donki/api';
import { EarthApi } from '../../features/earth/api';
import { ImagesApi } from '../../features/images/api';
import { SubscriptionService } from '../../features/subscriptions/subscription.service';

/**
 * Простой DI контейнер для управления зависимостями
 * Централизует создание и управление экземплярами сервисов и API клиентов
 */
class DIContainer {
  // API клиенты
  private _apodApi: ApodApi | null = null;
  private _asteroidsApi: AsteroidsApi | null = null;
  private _donkiApi: DonkiApi | null = null;
  private _earthApi: EarthApi | null = null;
  private _imagesApi: ImagesApi | null = null;

  // Сервисы
  private _apodService: ApodService | null = null;
  private _asteroidsService: AsteroidsService | null = null;
  private _subscriptionService: SubscriptionService | null = null;

  // API клиенты (lazy initialization)
  get apodApi(): ApodApi {
    if (!this._apodApi) {
      this._apodApi = new ApodApi(config.nasa.apiKey);
    }
    return this._apodApi;
  }

  get asteroidsApi(): AsteroidsApi {
    if (!this._asteroidsApi) {
      this._asteroidsApi = new AsteroidsApi(config.nasa.apiKey);
    }
    return this._asteroidsApi;
  }

  get donkiApi(): DonkiApi {
    if (!this._donkiApi) {
      this._donkiApi = new DonkiApi();
    }
    return this._donkiApi;
  }

  get earthApi(): EarthApi {
    if (!this._earthApi) {
      this._earthApi = new EarthApi();
    }
    return this._earthApi;
  }

  get imagesApi(): ImagesApi {
    if (!this._imagesApi) {
      this._imagesApi = new ImagesApi();
    }
    return this._imagesApi;
  }

  // Сервисы (lazy initialization)
  get apodService(): ApodService {
    if (!this._apodService) {
      this._apodService = new ApodService(this.apodApi);
    }
    return this._apodService;
  }

  get asteroidsService(): AsteroidsService {
    if (!this._asteroidsService) {
      this._asteroidsService = new AsteroidsService(this.asteroidsApi);
    }
    return this._asteroidsService;
  }

  get subscriptionService(): SubscriptionService {
    if (!this._subscriptionService) {
      this._subscriptionService = new SubscriptionService();
    }
    return this._subscriptionService;
  }

  /**
   * Метод для тестирования - позволяет заменить зависимости
   */
  setApodApi(api: ApodApi): void {
    this._apodApi = api;
    this._apodService = null; // Сброс сервиса, чтобы он пересоздался с новым API
  }

  setAsteroidsApi(api: AsteroidsApi): void {
    this._asteroidsApi = api;
    this._asteroidsService = null;
  }

  setApodService(service: ApodService): void {
    this._apodService = service;
  }

  setAsteroidsService(service: AsteroidsService): void {
    this._asteroidsService = service;
  }

  setSubscriptionService(service: SubscriptionService): void {
    this._subscriptionService = service;
  }
}

// Экспортируем singleton экземпляр
export const container = new DIContainer();

