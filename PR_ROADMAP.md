# Roadmap Pull Request'ов для улучшения проекта

Этот документ описывает последовательность Pull Request'ов для реализации критичных и средних приоритетных задач из `CODE_AUDIT.md`.

---

## 📋 Принципы организации PR'ов

1. **Небольшие и фокусированные** — каждый PR решает одну конкретную задачу
2. **Минимальные зависимости** — PR'ы можно мержить независимо, где это возможно
3. **Обратная совместимость** — изменения не ломают существующий функционал
4. **Тестируемость** — каждый PR можно протестировать отдельно

---

## 🟢 Срочно (Critical) — 6 PR'ов

### PR #1: Добавить .env.example и обновить документацию
**Приоритет:** 🔴 Критично  
**Оценка:** 15 минут  
**Зависимости:** Нет

**Описание:**
Создать файл `.env.example` со всеми переменными окружения и обновить README с актуальной информацией.

**Изменения:**
- [ ] Создать `.env.example` с обязательными и опциональными переменными
- [ ] Обновить `README.md` — убрать упоминание о копировании `.env.example` (если файла нет)
- [ ] Добавить комментарии в `.env.example` с описанием каждой переменной

**Файлы:**
- `.env.example` (новый)
- `README.md`

**Пример `.env.example`:**
```env
# Обязательные переменные
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NASA_API_KEY=your_nasa_api_key
DATABASE_URL=file:./data/bot.db
NODE_ENV=development

# Опциональные переменные
SENTRY_DSN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
DOMAIN_URL=http://localhost:3000
WEBHOOK_PORT=3000
```

---

### PR #2: Исправить Dockerfile и Makefile
**Приоритет:** 🔴 Критично  
**Оценка:** 30 минут  
**Зависимости:** Нет

**Описание:**
Обновить Dockerfile до Node.js 18, исправить процесс сборки с Prisma и исправить имя образа в Makefile.

**Изменения:**
- [ ] Обновить `Dockerfile` — использовать `node:18-alpine`
- [ ] Исправить порядок команд в Dockerfile (копировать Prisma schema перед генерацией)
- [ ] Исправить `Makefile` — заменить `tg-gpt-chat` на `nasa-tg-bot`
- [ ] Добавить HEALTHCHECK в Dockerfile (опционально)

**Файлы:**
- `Dockerfile`
- `Makefile`

**Изменения в Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci

# Генерируем Prisma client
RUN npm run db:generate

# Копируем остальной код
COPY . .

# Собираем проект
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

---

### PR #3: Добавить валидацию env переменных через zod
**Приоритет:** 🔴 Критично  
**Оценка:** 1 час  
**Зависимости:** PR #1 (для .env.example)

**Описание:**
Заменить ручную валидацию переменных окружения на строгую типизацию через zod.

**Изменения:**
- [ ] Установить `zod` (если еще не установлен): `npm install zod`
- [ ] Создать `src/app/config/validation.ts` с zod схемой
- [ ] Обновить `src/app/config/development.ts` и `production.ts` — использовать валидированные env
- [ ] Удалить функцию `validateConfig()` из `src/app/index.ts`
- [ ] Обновить типы в `src/app/types/index.ts` (если нужно)

**Файлы:**
- `src/app/config/validation.ts` (новый)
- `src/app/config/development.ts`
- `src/app/config/production.ts`
- `src/app/index.ts`
- `package.json` (добавить zod в dependencies)

**Пример `src/app/config/validation.ts`:**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  NASA_API_KEY: z.string().min(1, 'NASA_API_KEY is required'),
  DATABASE_URL: z.string().default('file:./data/bot.db'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  SENTRY_DSN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DOMAIN_URL: z.string().default('http://localhost:3000'),
  WEBHOOK_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Ошибки конфигурации:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}
```

---

### PR #4: Заменить any типы на конкретные типы
**Приоритет:** 🔴 Критично  
**Оценка:** 2 часа  
**Зависимости:** Нет

**Описание:**
Создать типы для параметров подписок и заменить все использования `any` на конкретные типы.

**Изменения:**
- [ ] Создать `src/entities/subscription/types.ts` с типами для параметров подписок
- [ ] Обновить `src/features/subscriptions/subscription.service.ts` — использовать типы вместо `Record<string, any>`
- [ ] Обновить `src/processes/schedulers/subscription.scheduler.ts` — заменить `any` на конкретные типы
- [ ] Обновить `src/features/subscriptions/commands.unsubscribe.ts` — типизировать `buttons`
- [ ] Обновить `src/features/subscriptions/commands.subscribe.ts` — типизировать `hourButtons`

**Файлы:**
- `src/entities/subscription/types.ts` (новый)
- `src/features/subscriptions/subscription.service.ts`
- `src/processes/schedulers/subscription.scheduler.ts`
- `src/features/subscriptions/commands.unsubscribe.ts`
- `src/features/subscriptions/commands.subscribe.ts`

**Пример `src/entities/subscription/types.ts`:**
```typescript
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
```

---

### PR #5: Добавить обработку ошибок в action handlers
**Приоритет:** 🔴 Критично  
**Оценка:** 1.5 часа  
**Зависимости:** Нет

**Описание:**
Обернуть все action handlers в try-catch и добавить обработку незакрытых промисов.

**Изменения:**
- [ ] Обновить `src/processes/bot/index.ts` — обернуть все action handlers в try-catch
- [ ] Обновить `src/processes/notifications/donki-notifications.ts` — добавить await для `.catch()`
- [ ] Убедиться, что все промисы обрабатываются корректно

**Файлы:**
- `src/processes/bot/index.ts`
- `src/processes/notifications/donki-notifications.ts`

**Пример изменений:**
```typescript
// В bot/index.ts
this.bot.action(/^donki_cme_(today|week|month|7days)$/, async (ctx) => {
  try {
    if ('data' in ctx.callbackQuery) {
      const period = ctx.callbackQuery.data.split('_').pop();
      const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 7;
      await handleDonkiCMEData(ctx as BotContext, days);
    }
  } catch (error) {
    await handleTelegramError(ctx as BotContext, error, 'DonkiCME');
  }
});
```

---

### PR #6: Удалить неиспользуемый NasaAPI класс
**Приоритет:** 🔴 Критично  
**Оценка:** 15 минут  
**Зависимости:** Нет

**Описание:**
Удалить старый неиспользуемый класс `NasaAPI` из `src/features/nasa/api.ts`.

**Изменения:**
- [ ] Проверить, что `src/features/nasa/api.ts` не используется нигде
- [ ] Удалить `src/features/nasa/api.ts`
- [ ] Проверить, что `src/features/nasa/formatters.ts` используется (если нет — удалить)
- [ ] Обновить импорты, если есть ссылки на удаленные файлы

**Файлы:**
- `src/features/nasa/api.ts` (удалить)
- `src/features/nasa/formatters.ts` (проверить и удалить, если не используется)

---

## 🟡 Средний приоритет — 9 PR'ов

### PR #7: Создать единый logger с контекстом
**Приоритет:** 🟡 Средний  
**Оценка:** 1.5 часа  
**Зависимости:** Нет

**Описание:**
Создать единый logger для замены `console.error` и `console.log` на структурированное логирование с интеграцией Sentry.

**Изменения:**
- [ ] Создать `src/shared/logger/index.ts` с единым logger
- [ ] Заменить `console.error` на `logger.error` в scheduler и notifications
- [ ] Заменить `console.log` на `logger.info` где уместно
- [ ] Обновить все файлы, использующие console

**Файлы:**
- `src/shared/logger/index.ts` (новый)
- `src/processes/schedulers/subscription.scheduler.ts`
- `src/processes/notifications/donki-notifications.ts`
- `src/processes/bot/index.ts`
- Другие файлы с console.log/error

**Пример `src/shared/logger/index.ts`:**
```typescript
import * as Sentry from '@sentry/node';

interface LogContext {
  [key: string]: any;
}

export const logger = {
  error: (message: string, error?: unknown, context?: LogContext) => {
    console.error(`[ERROR] ${message}`, error, context);
    if (error) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: context,
        tags: { logger: 'error' },
      });
    }
  },
  
  info: (message: string, context?: LogContext) => {
    console.log(`[INFO] ${message}`, context);
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context);
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: context,
    });
  },
  
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
};
```

---

### PR #8: Расширить DI контейнер для всех сервисов
**Приоритет:** 🟡 Средний  
**Оценка:** 1 час  
**Зависимости:** PR #7 (logger)

**Описание:**
Добавить в DI контейнер все сервисы (SubscriptionService, репозитории) и обновить код для использования контейнера.

**Изменения:**
- [ ] Обновить `src/shared/di/container.ts` — добавить SubscriptionService
- [ ] Обновить `src/processes/schedulers/subscription.scheduler.ts` — использовать container.subscriptionService
- [ ] Добавить методы для тестирования (setSubscriptionService)

**Файлы:**
- `src/shared/di/container.ts`
- `src/processes/schedulers/subscription.scheduler.ts`

**Пример изменений:**
```typescript
// В container.ts
import { SubscriptionService } from '../../features/subscriptions/subscription.service';

class DIContainer {
  private _subscriptionService: SubscriptionService | null = null;
  
  get subscriptionService(): SubscriptionService {
    if (!this._subscriptionService) {
      this._subscriptionService = new SubscriptionService();
    }
    return this._subscriptionService;
  }
  
  setSubscriptionService(service: SubscriptionService): void {
    this._subscriptionService = service;
  }
}
```

---

### PR #9: Создать репозитории для всех сущностей
**Приоритет:** 🟡 Средний  
**Оценка:** 2 часа  
**Зависимости:** PR #8

**Описание:**
Создать репозитории для User, Subscription и Premium, чтобы убрать прямой доступ к Prisma из сервисов.

**Изменения:**
- [ ] Создать `src/shared/db/repositories/user.repository.ts`
- [ ] Создать `src/shared/db/repositories/subscription.repository.ts` (для обычных подписок)
- [ ] Создать `src/shared/db/repositories/premium.repository.ts`
- [ ] Обновить `src/features/subscriptions/subscription.service.ts` — использовать репозиторий
- [ ] Обновить DI контейнер — добавить репозитории

**Файлы:**
- `src/shared/db/repositories/user.repository.ts` (новый)
- `src/shared/db/repositories/subscription.repository.ts` (новый)
- `src/shared/db/repositories/premium.repository.ts` (новый)
- `src/features/subscriptions/subscription.service.ts`
- `src/shared/di/container.ts`

**Пример `src/shared/db/repositories/subscription.repository.ts`:**
```typescript
import { prisma } from '../prisma';
import { SubscriptionParams } from '../../../entities/subscription/types';

export class SubscriptionRepository {
  async create(data: {
    telegramId: string;
    chatId: string;
    type: 'apod' | 'earth' | 'donki';
    hourUtc: number;
    params?: SubscriptionParams;
  }) {
    return prisma.subscription.create({
      data: {
        telegramId: data.telegramId,
        chatId: data.chatId,
        type: data.type,
        hourUtc: data.hourUtc,
        params: data.params ?? undefined,
        enabled: true,
      },
    });
  }
  
  async findByChat(chatId: string) {
    return prisma.subscription.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async findEnabled() {
    return prisma.subscription.findMany({
      where: { enabled: true },
      orderBy: { hourUtc: 'asc' },
    });
  }
  
  // ... другие методы
}
```

---

### PR #10: Рефакторинг FSD — убрать зависимости features от processes
**Приоритет:** 🟡 Средний  
**Оценка:** 3 часа  
**Зависимости:** PR #4, PR #9

**Описание:**
Создать базовые типы в shared и переместить обработчики подписок из features в processes.

**Изменения:**
- [ ] Создать `src/shared/types/telegram.ts` с базовыми типами Telegram контекста
- [ ] Переместить `src/features/subscriptions/commands.subscribe.ts` → `src/processes/bot/handlers/subscriptions/subscribe.ts`
- [ ] Переместить `src/features/subscriptions/commands.unsubscribe.ts` → `src/processes/bot/handlers/subscriptions/unsubscribe.ts`
- [ ] Обновить импорты в `src/processes/bot/index.ts`
- [ ] Обновить типы в обработчиках — использовать базовые типы из shared

**Файлы:**
- `src/shared/types/telegram.ts` (новый)
- `src/processes/bot/handlers/subscriptions/subscribe.ts` (новый, перемещен)
- `src/processes/bot/handlers/subscriptions/unsubscribe.ts` (новый, перемещен)
- `src/features/subscriptions/commands.subscribe.ts` (удалить)
- `src/features/subscriptions/commands.unsubscribe.ts` (удалить)
- `src/processes/bot/index.ts`

**Пример `src/shared/types/telegram.ts`:**
```typescript
export interface BaseTelegramContext {
  from?: { id: number; username?: string; first_name?: string };
  chat?: { id: number; type?: string };
  reply: (text: string, options?: any) => Promise<any>;
  answerCbQuery: (text?: string, options?: any) => Promise<boolean>;
  editMessageText: (text: string, options?: any) => Promise<any>;
  deleteMessage: (messageId: number) => Promise<boolean>;
  sendChatAction: (action: string) => Promise<boolean>;
}
```

---

### PR #11: Добавить валидацию пользовательского ввода
**Приоритет:** 🟡 Средний  
**Оценка:** 1.5 часа  
**Зависимости:** PR #10

**Описание:**
Создать валидаторы для пользовательского ввода (время подписки, поисковые запросы и т.д.).

**Изменения:**
- [ ] Создать `src/shared/lib/validators.ts` с функциями валидации
- [ ] Обновить `src/processes/bot/handlers/subscriptions/subscribe.ts` — валидация времени
- [ ] Обновить `src/processes/bot/handlers/images.ts` — валидация поискового запроса
- [ ] Добавить сообщения об ошибках валидации

**Файлы:**
- `src/shared/lib/validators.ts` (новый)
- `src/processes/bot/handlers/subscriptions/subscribe.ts`
- `src/processes/bot/handlers/images.ts`

**Пример `src/shared/lib/validators.ts`:**
```typescript
export function validateHourUtc(hour: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(hour)) {
    return { valid: false, error: 'Час должен быть целым числом' };
  }
  if (hour < 0 || hour > 23) {
    return { valid: false, error: 'Час должен быть от 0 до 23' };
  }
  return { valid: true };
}

export function validateSearchQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Запрос должен содержать минимум 2 символа' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Запрос не должен превышать 100 символов' };
  }
  return { valid: true };
}
```

---

### PR #12: Обработка блокировок бота пользователем
**Приоритет:** 🟡 Средний  
**Оценка:** 1 час  
**Зависимости:** PR #8, PR #9

**Описание:**
Добавить автоматическое отключение подписок при блокировке бота пользователем (403 ошибка).

**Изменения:**
- [ ] Обновить `src/processes/schedulers/subscription.scheduler.ts` — обрабатывать 403 ошибку
- [ ] Добавить логику автоматического отключения подписки при 403
- [ ] Обновить `src/processes/notifications/donki-notifications.ts` — убедиться, что обработка 403 есть

**Файлы:**
- `src/processes/schedulers/subscription.scheduler.ts`
- `src/processes/notifications/donki-notifications.ts` (проверить, что обработка есть)

**Пример изменений:**
```typescript
private async sendApodNotification(subscription: {...}) {
  try {
    const apod = await container.apodService.getRandomApod();
    // ... отправка
  } catch (error: unknown) {
    if (this.isBotBlockedError(error)) {
      await this.subscriptionService.disable(subscription.id, subscription.chatId);
      logger.info(`Подписка ${subscription.id} отключена: пользователь заблокировал бота`);
      return;
    }
    throw error;
  }
}

private isBotBlockedError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const telegramError = error as { response?: { error_code?: number } };
    return telegramError.response?.error_code === 403;
  }
  return false;
}
```

---

### PR #13: Добавить кеширование для NASA API
**Приоритет:** 🟡 Средний  
**Оценка:** 2 часа  
**Зависимости:** PR #7

**Описание:**
Добавить in-memory кеширование для NASA API ответов, чтобы уменьшить количество запросов.

**Изменения:**
- [ ] Установить `node-cache`: `npm install node-cache @types/node-cache`
- [ ] Создать `src/shared/lib/cache.ts` с оберткой для кеширования
- [ ] Обновить `src/shared/api/nasa.ts` — добавить кеширование в метод `get`
- [ ] Обновить `src/features/apod/services/apodService.ts` — использовать кеш для случайных APOD

**Файлы:**
- `src/shared/lib/cache.ts` (новый)
- `src/shared/api/nasa.ts`
- `src/features/apod/services/apodService.ts`
- `package.json`

**Пример `src/shared/lib/cache.ts`:**
```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ 
  stdTTL: 3600, // 1 час по умолчанию
  checkperiod: 600, // проверка каждые 10 минут
});

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached) {
    return cached;
  }
  
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

export function clearCache(pattern?: string): void {
  if (pattern) {
    const keys = cache.keys().filter(key => key.includes(pattern));
    cache.del(keys);
  } else {
    cache.flushAll();
  }
}
```

---

### PR #14: Добавить scheduled task для очистки старых логов
**Приоритет:** 🟡 Средний  
**Оценка:** 1.5 часа  
**Зависимости:** PR #7, PR #9

**Описание:**
Создать scheduler для автоматической очистки старых записей из NotificationLog (старше 30 дней).

**Изменения:**
- [ ] Создать `src/processes/schedulers/cleanup.scheduler.ts`
- [ ] Добавить метод очистки старых логов (старше 30 дней)
- [ ] Запускать очистку раз в день (cron: `0 2 * * *` — в 2:00 UTC)
- [ ] Интегрировать в `src/app/index.ts`

**Файлы:**
- `src/processes/schedulers/cleanup.scheduler.ts` (новый)
- `src/app/index.ts`

**Пример `src/processes/schedulers/cleanup.scheduler.ts`:**
```typescript
import * as cron from 'node-cron';
import { prisma } from '../../shared/db/prisma';
import { logger } from '../../shared/logger';

export class CleanupScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  public start() {
    if (this.isRunning) {
      logger.warn('CleanupScheduler уже запущен');
      return;
    }

    this.isRunning = true;
    // Запускаем каждый день в 2:00 UTC
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldLogs();
    });

    logger.info('CleanupScheduler запущен. Очистка каждый день в 2:00 UTC');
  }

  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('CleanupScheduler остановлен');
  }

  private async cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info(`Очищено ${result.count} старых записей из NotificationLog`);
    } catch (error) {
      logger.error('Ошибка при очистке старых логов', error);
    }
  }
}
```

---

### PR #15: Добавить unit тесты для критичных модулей
**Приоритет:** 🟡 Средний  
**Оценка:** 4 часа  
**Зависимости:** PR #8, PR #9, PR #13

**Описание:**
Добавить unit тесты для ApodService, NasaApi, RateLimiter и SubscriptionService (расширить существующие).

**Изменения:**
- [ ] Создать `tests/unit/features/apod/apodService.spec.ts`
- [ ] Создать `tests/unit/shared/api/nasa.spec.ts`
- [ ] Создать `tests/unit/shared/lib/rateLimiter.spec.ts`
- [ ] Расширить `tests/subscription.service.spec.ts` — добавить тесты для всех методов
- [ ] Настроить моки для внешних зависимостей

**Файлы:**
- `tests/unit/features/apod/apodService.spec.ts` (новый)
- `tests/unit/shared/api/nasa.spec.ts` (новый)
- `tests/unit/shared/lib/rateLimiter.spec.ts` (новый)
- `tests/subscription.service.spec.ts` (расширить)

**Пример структуры теста:**
```typescript
// tests/unit/features/apod/apodService.spec.ts
import { ApodService } from '../../../src/features/apod/services/apodService';
import { ApodApi } from '../../../src/features/apod/api';
import { container } from '../../../src/shared/di/container';

jest.mock('../../../src/features/apod/api');

describe('ApodService', () => {
  let service: ApodService;
  let mockApi: jest.Mocked<ApodApi>;

  beforeEach(() => {
    mockApi = new ApodApi('test-key') as jest.Mocked<ApodApi>;
    container.setApodApi(mockApi);
    service = container.apodService;
  });

  describe('getRandomApod', () => {
    it('должен вернуть случайный APOD', async () => {
      const mockApod = { /* ... */ };
      mockApi.getApod.mockResolvedValue(mockApod);
      
      const result = await service.getRandomApod();
      
      expect(result).toEqual(mockApod);
      expect(mockApi.getApod).toHaveBeenCalled();
    });
  });
});
```

---

## 📊 Итоговая таблица PR'ов

| # | Название | Приоритет | Оценка | Зависимости |
|---|----------|-----------|--------|-------------|
| 1 | Добавить .env.example | 🔴 | 15 мин | - |
| 2 | Исправить Dockerfile и Makefile | 🔴 | 30 мин | - |
| 3 | Валидация env через zod | 🔴 | 1 час | PR #1 |
| 4 | Заменить any типы | 🔴 | 2 часа | - |
| 5 | Обработка ошибок в handlers | 🔴 | 1.5 часа | - |
| 6 | Удалить неиспользуемый NasaAPI | 🔴 | 15 мин | - |
| 7 | Единый logger | 🟡 | 1.5 часа | - |
| 8 | Расширить DI контейнер | 🟡 | 1 час | PR #7 |
| 9 | Создать репозитории | 🟡 | 2 часа | PR #8 |
| 10 | Рефакторинг FSD | 🟡 | 3 часа | PR #4, PR #9 |
| 11 | Валидация ввода | 🟡 | 1.5 часа | PR #10 |
| 12 | Обработка блокировок | 🟡 | 1 час | PR #8, PR #9 |
| 13 | Кеширование NASA API | 🟡 | 2 часа | PR #7 |
| 14 | Очистка старых логов | 🟡 | 1.5 часа | PR #7, PR #9 |
| 15 | Unit тесты | 🟡 | 4 часа | PR #8, PR #9, PR #13 |

**Общая оценка:** ~25 часов работы

---

## 🚀 Рекомендуемый порядок мержа

### Фаза 1: Критичные исправления (можно мержить параллельно)
1. PR #1, PR #2, PR #6 — независимые, можно мержить сразу
2. PR #4 — независимый
3. PR #5 — независимый
4. PR #3 — зависит от PR #1

### Фаза 2: Инфраструктура и логирование
5. PR #7 — основа для следующих PR'ов
6. PR #8 — зависит от PR #7
7. PR #9 — зависит от PR #8

### Фаза 3: Рефакторинг и улучшения
8. PR #10 — зависит от PR #4, PR #9
9. PR #11 — зависит от PR #10
10. PR #12 — зависит от PR #8, PR #9
11. PR #13 — зависит от PR #7
12. PR #14 — зависит от PR #7, PR #9

### Фаза 4: Тестирование
13. PR #15 — зависит от PR #8, PR #9, PR #13

---

## 📝 Чеклист для каждого PR

Перед созданием PR убедитесь, что:

- [ ] Код следует существующим конвенциям проекта
- [ ] Нет новых ошибок линтера (`npm run lint`)
- [ ] Код скомпилирован без ошибок (`npm run build`)
- [ ] Существующие тесты проходят (`npm test`)
- [ ] Добавлены новые тесты (если применимо)
- [ ] Обновлена документация (если нужно)
- [ ] Проверено, что изменения не ломают существующий функционал
- [ ] PR имеет понятное описание и связан с задачей из CODE_AUDIT.md

---

## 🔄 После мержа всех PR'ов

После завершения всех PR'ов рекомендуется:

1. **Провести финальный аудит** — убедиться, что все проблемы из CODE_AUDIT.md решены
2. **Обновить документацию** — README, API docs
3. **Провести нагрузочное тестирование** — проверить производительность с кешированием
4. **Подготовить релиз** — обновить версию в package.json, создать changelog

---

**Дата создания:** 2025-01-XX  
**Последнее обновление:** 2025-01-XX

