# Технический аудит проекта nasa-tg-bot

**Дата аудита:** 2025-01-XX  
**Версия проекта:** 1.0.0  
**Архитектура:** Feature-Sliced Design (FSD)  
**Стек:** TypeScript, Node.js, Telegraf, Prisma, Axios, Docker

---

## 📋 Оглавление

1. [Сильные стороны](#сильные-стороны)
2. [Архитектурные проблемы](#архитектурные-проблемы)
3. [Проблемы качества кода](#проблемы-качества-кода)
4. [Функциональные проблемы](#функциональные-проблемы)
5. [Инфраструктурные проблемы](#инфраструктурные-проблемы)
6. [Проблемы тестирования](#проблемы-тестирования)
7. [Проблемы безопасности](#проблемы-безопасности)
8. [Проблемы производительности](#проблемы-производительности)
9. [Roadmap улучшений](#roadmap-улучшений)

---

## ✅ Сильные стороны

### Архитектура
- ✅ **FSD структура** — проект следует принципам Feature-Sliced Design с четким разделением слоев
- ✅ **Dependency Injection** — реализован простой DI контейнер для управления зависимостями
- ✅ **Разделение ответственности** — бизнес-логика вынесена в сервисы, хендлеры только координируют
- ✅ **Обработка ошибок** — единый middleware для обработки ошибок с интеграцией Sentry
- ✅ **Rate Limiting** — защита от спама с разными лимитами для команд и callback queries

### Качество кода
- ✅ **TypeScript strict mode** — включен strict режим с хорошей типизацией
- ✅ **Retry механизм** — автоматические повторы запросов к API с exponential backoff
- ✅ **Управление сессиями** — автоматическая очистка устаревших сессий (TTL 24 часа)
- ✅ **Логирование** — интеграция с Sentry для мониторинга ошибок

### Функциональность
- ✅ **Команды работают** — `/start`, `/apod`, `/earth`, `/asteroids`, `/images`, `/donki`, `/help` реализованы
- ✅ **Подписки** — система подписок на уведомления реализована и работает
- ✅ **Prisma миграции** — миграции БД настроены корректно
- ✅ **Индексы БД** — основные индексы присутствуют в schema

---

## 🏗️ Архитектурные проблемы

### 🔴 Критично

#### 1. Нарушение FSD: features зависят от processes
**Проблема:** Обработчики подписок (`commands.subscribe.ts`, `commands.unsubscribe.ts`) находятся в `features/subscriptions/`, но они напрямую используют `BotContext` из `processes/bot/types.ts`. Это нарушает правило FSD о том, что features не должны зависеть от processes.

**Файлы:**
- `src/features/subscriptions/commands.subscribe.ts`
- `src/features/subscriptions/commands.unsubscribe.ts`

**Решение:**
```typescript
// Создать shared/types/telegram.ts с базовыми типами
export interface BaseTelegramContext {
  from?: { id: number; username?: string };
  chat?: { id: number };
  reply: (text: string, options?: any) => Promise<any>;
  // ... другие базовые методы
}

// В features использовать BaseTelegramContext вместо BotContext
```

#### 2. Дублирование API клиентов
**Проблема:** Существуют два разных NASA API клиента:
- `src/shared/api/nasa.ts` (NasaApi) — используется в features
- `src/features/nasa/api.ts` (NasaAPI) — старый, не используется, но не удален

**Файлы:**
- `src/shared/api/nasa.ts`
- `src/features/nasa/api.ts`

**Решение:** Удалить `src/features/nasa/api.ts` и все его импорты (если есть).

#### 3. DI контейнер неполный
**Проблема:** DI контейнер не содержит все сервисы:
- `SubscriptionService` создается напрямую в scheduler
- `DonkiApi`, `EarthApi`, `ImagesApi` не имеют сервисного слоя
- Нет единой точки регистрации всех зависимостей

**Файлы:**
- `src/shared/di/container.ts`
- `src/processes/schedulers/subscription.scheduler.ts`

**Решение:**
```typescript
// Расширить DI контейнер
class DIContainer {
  private _subscriptionService: SubscriptionService | null = null;
  
  get subscriptionService(): SubscriptionService {
    if (!this._subscriptionService) {
      this._subscriptionService = new SubscriptionService();
    }
    return this._subscriptionService;
  }
  
  // Добавить методы для всех сервисов
}
```

### 🟡 Средний приоритет

#### 4. Отсутствие слоя repositories для всех сущностей
**Проблема:** Только `DonkiSubscription` имеет репозиторий, но `Subscription`, `User`, `Premium` работают напрямую с Prisma.

**Файлы:**
- `src/shared/db/repositories/subscriptions.ts` (только для DonkiSubscription)
- `src/features/subscriptions/subscription.service.ts` (прямой доступ к Prisma)

**Решение:** Создать репозитории для всех сущностей:
- `UserRepository`
- `SubscriptionRepository` (для обычных подписок)
- `PremiumRepository`

#### 5. Конфигурация не валидируется через zod/envsafe
**Проблема:** Валидация переменных окружения происходит вручную в `src/app/index.ts`, нет строгой типизации и валидации через zod.

**Файлы:**
- `src/app/index.ts` (функция `validateConfig`)
- `src/app/config/development.ts`
- `src/app/config/production.ts`

**Решение:**
```typescript
// src/app/config/validation.ts
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  NASA_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().default('file:./data/bot.db'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  SENTRY_DSN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  // ...
});

export const env = envSchema.parse(process.env);
```

---

## 💻 Проблемы качества кода

### 🔴 Критично

#### 6. Использование `any` в критических местах
**Проблема:** Найдено 17 использований `any`, особенно в:
- `src/processes/schedulers/subscription.scheduler.ts` (params: any, payload: any)
- `src/features/subscriptions/subscription.service.ts` (params?: Record<string, any>)
- `src/features/subscriptions/commands.unsubscribe.ts` (buttons: any[])

**Файлы:**
- `src/processes/schedulers/subscription.scheduler.ts:92, 96, 168, 194, 260`
- `src/features/subscriptions/subscription.service.ts:10`
- `src/features/subscriptions/commands.unsubscribe.ts:46`

**Решение:**
```typescript
// Создать типы для params подписок
export interface SubscriptionParams {
  type?: 'natural' | 'enhanced'; // для earth
  eventType?: 'cme' | 'notifications' | 'wsaenlil'; // для donki
}

// В scheduler
private async sendSubscriptionNotification(subscription: {
  id: number;
  telegramId: string;
  chatId: string;
  type: string;
  params: SubscriptionParams | null;
}) { ... }
```

#### 7. Незакрытые промисы в обработчиках
**Проблема:** В некоторых обработчиках промисы не ожидаются через `await`, что может привести к "зависшим промисам".

**Файлы:**
- `src/processes/notifications/donki-notifications.ts:46, 52` — `.catch()` без await
- `src/processes/bot/index.ts:189-218` — обработчики action могут не обрабатывать ошибки

**Решение:**
```typescript
// В donki-notifications.ts
this.checkNewEvents().catch((error) => {
  console.error('Ошибка при первой проверке событий:', error);
  Sentry.captureException(error);
});

// В bot/index.ts - обернуть все action handlers
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

### 🟡 Средний приоритет

#### 8. Дублирование кода в обработчиках
**Проблема:** Повторяющаяся логика обработки периодов в DONKI handlers:
- `src/processes/bot/index.ts:189-219` — одинаковый код для парсинга периодов

**Решение:** Вынести в утилиту:
```typescript
// src/shared/lib/dateHelpers.ts
export function parsePeriodToDays(period: string): number {
  const periodMap: Record<string, number> = {
    today: 1,
    week: 7,
    month: 30,
    '7days': 7,
  };
  return periodMap[period] || 7;
}
```

#### 9. Отсутствие типов для Prisma Json полей
**Проблема:** `params: Json?` в Prisma schema не имеет TypeScript типов.

**Файлы:**
- `prisma/schema.prisma:45`
- `src/features/subscriptions/subscription.service.ts:10`

**Решение:**
```typescript
// src/entities/subscription/types.ts
export interface SubscriptionParams {
  type?: 'natural' | 'enhanced';
  eventType?: 'cme' | 'notifications' | 'wsaenlil';
  alertLevel?: 'extreme' | 'high' | 'all';
}

// В Prisma schema использовать Prisma.JsonObject или создать custom type
```

#### 10. Логирование ошибок без контекста
**Проблема:** В некоторых местах используется `console.error` без структурированного логирования.

**Файлы:**
- `src/processes/schedulers/subscription.scheduler.ts:80, 130, 276`
- `src/processes/notifications/donki-notifications.ts:47, 53, 95, 133, 165, 197`

**Решение:** Использовать единый logger:
```typescript
// src/shared/logger/index.ts
import * as Sentry from '@sentry/node';

export const logger = {
  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    console.error(message, error);
    if (error) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: context,
      });
    }
  },
  info: (message: string, context?: Record<string, any>) => {
    console.log(message, context);
  },
};
```

---

## 🔧 Функциональные проблемы

### 🟡 Средний приоритет

#### 11. Отсутствие валидации пользовательского ввода
**Проблема:** Нет валидации времени подписки, параметров команд и т.д.

**Файлы:**
- `src/features/subscriptions/commands.subscribe.ts` — `handleSubscribeTimeInput`
- `src/processes/bot/handlers/images.ts` — поиск по запросу

**Решение:**
```typescript
// src/shared/lib/validators.ts
export function validateHourUtc(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

export function validateSearchQuery(query: string): boolean {
  return query.trim().length >= 2 && query.trim().length <= 100;
}
```

#### 12. Нет обработки случая, когда пользователь блокирует бота
**Проблема:** При отправке уведомлений подписчикам не обрабатывается случай, когда пользователь заблокировал бота (кроме DONKI notifications).

**Файлы:**
- `src/processes/schedulers/subscription.scheduler.ts:142-160` — нет обработки 403 ошибки

**Решение:**
```typescript
private async sendApodNotification(subscription: {...}) {
  try {
    // ... отправка
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const telegramError = error as { response?: { error_code?: number } };
      if (telegramError.response?.error_code === 403) {
        // Отключить подписку автоматически
        await this.subscriptionService.disable(subscription.id, subscription.chatId);
        return;
      }
    }
    throw error;
  }
}
```

#### 13. Отсутствие миграции для очистки старых NotificationLog
**Проблема:** `NotificationLog` будет расти бесконечно, нет автоматической очистки старых записей.

**Файлы:**
- `prisma/schema.prisma:57-73`

**Решение:** Добавить cron job или scheduled task для очистки:
```typescript
// src/processes/schedulers/cleanup.scheduler.ts
export class CleanupScheduler {
  async cleanupOldLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await prisma.notificationLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });
  }
}
```

---

## 🏭 Инфраструктурные проблемы

### 🔴 Критично

#### 14. Отсутствует .env.example
**Проблема:** В README упоминается `.env.example`, но файл отсутствует в репозитории.

**Решение:** Создать `.env.example`:
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

#### 15. Dockerfile использует устаревшую версию Node.js
**Проблема:** Dockerfile использует `node:14`, но в package.json требуется Node.js 18+.

**Файлы:**
- `Dockerfile:2`

**Решение:**
```dockerfile
FROM node:18-alpine
```

#### 16. Makefile содержит неправильное имя образа
**Проблема:** Makefile использует `tg-gpt-chat` вместо `nasa-tg-bot`.

**Файлы:**
- `Makefile:2, 5`

**Решение:**
```makefile
build: 
	docker build -t nasa-tg-bot .

run:
	docker run -d -p 3000:3000 --name nasa-tg-bot --rm nasa-tg-bot
```

#### 17. Dockerfile не копирует Prisma schema перед генерацией
**Проблема:** Dockerfile копирует все файлы сразу, но Prisma клиент должен генерироваться после копирования schema.

**Файлы:**
- `Dockerfile`

**Решение:**
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

CMD ["npm", "start"]
```

### 🟡 Средний приоритет

#### 18. Отсутствует docker-compose.yml
**Проблема:** Нет docker-compose для удобного запуска с БД и другими сервисами.

**Решение:** Создать `docker-compose.yml`:
```yaml
version: '3.8'
services:
  bot:
    build: .
    env_file: .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

#### 19. Нет healthcheck в Dockerfile
**Проблема:** Dockerfile не содержит HEALTHCHECK для мониторинга состояния контейнера.

**Решение:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## 🧪 Проблемы тестирования

### 🔴 Критично

#### 20. Минимальное покрытие тестами
**Проблема:** Есть только один тест для `SubscriptionService`, остальной код не покрыт тестами.

**Файлы:**
- `tests/subscription.service.spec.ts` — единственный тест

**Решение:** Создать структуру тестов:
```
tests/
├── unit/
│   ├── features/
│   │   ├── apod/
│   │   │   ├── apodService.spec.ts
│   │   │   └── apodApi.spec.ts
│   │   └── subscriptions/
│   │       └── subscription.service.spec.ts ✅
│   └── shared/
│       ├── api/
│       │   └── nasa.spec.ts
│       └── lib/
│           └── rateLimiter.spec.ts
├── integration/
│   ├── bot/
│   │   └── handlers.spec.ts
│   └── subscriptions/
│       └── subscription.flow.spec.ts
└── e2e/
    └── commands.spec.ts
```

**Приоритетные модули для тестирования:**
1. `ApodService` — критичная бизнес-логика
2. `NasaApi` — retry механизм
3. `RateLimiter` — защита от спама
4. `SubscriptionScheduler` — автоматические уведомления
5. Обработчики команд (интеграционные тесты)

---

## 🔒 Проблемы безопасности

### 🟡 Средний приоритет

#### 21. Нет валидации Stripe webhook подписи в development
**Проблема:** В `src/app/payments.webhook.ts` верификация подписи отключена в development, что может быть опасно.

**Файлы:**
- `src/app/payments.webhook.ts:16`

**Решение:** Всегда проверять подпись, но использовать test webhook secret в development:
```typescript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required');
}
// Всегда проверять подпись
```

#### 22. Потенциальная утечка токенов в логах
**Проблема:** В `src/app/payments.webhook.ts:95` создается новый Stripe клиент, но нет проверки на утечку токенов в логах.

**Решение:** Использовать маскирование в логах:
```typescript
function maskToken(token: string): string {
  if (token.length < 8) return '***';
  return token.slice(0, 4) + '***' + token.slice(-4);
}

console.log('Stripe key:', maskToken(process.env.STRIPE_SECRET_KEY || ''));
```

#### 23. Нет rate limiting для webhook endpoint
**Проблема:** Webhook endpoint не защищен от DDoS атак.

**Файлы:**
- `src/app/webhook.server.ts`

**Решение:** Добавить rate limiting:
```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
});

app.use('/api/payments', webhookLimiter, createStripeWebhookHandler());
```

#### 24. SQL injection через Prisma (низкий риск)
**Проблема:** Prisma защищает от SQL injection, но нужно убедиться, что все запросы используют параметризованные запросы.

**Статус:** ✅ Prisma использует параметризованные запросы по умолчанию, но стоит проверить использование `$queryRaw`.

---

## ⚡ Проблемы производительности

### 🟡 Средний приоритет

#### 25. Отсутствие кеширования NASA API ответов
**Проблема:** Каждый запрос к NASA API выполняется заново, нет кеширования.

**Файлы:**
- `src/shared/api/nasa.ts`
- `src/features/apod/services/apodService.ts`

**Решение:** Добавить кеширование (Redis или in-memory):
```typescript
// src/shared/lib/cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 час

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached) return cached;
  
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

// Использование
const apod = await getCached(
  `apod:${date}`,
  () => this.apodApi.getApod(date),
  3600
);
```

#### 26. Rate limiter хранит данные в памяти
**Проблема:** `rateLimiter.ts` использует `Map` в памяти, что не масштабируется для множества инстансов.

**Файлы:**
- `src/shared/lib/rateLimiter.ts:12`

**Решение:** Для production использовать Redis:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Использовать Redis для rate limiting
```

#### 27. Нет пагинации для больших результатов
**Проблема:** При запросе большого количества данных (например, астероидов за 7 дней) все данные загружаются сразу.

**Файлы:**
- `src/features/asteroids/services/asteroidsService.ts`

**Решение:** Добавить пагинацию или лимиты:
```typescript
async getAsteroids(days: number, limit: number = 50) {
  // Ограничить количество дней и результаты
}
```

#### 28. SubscriptionScheduler загружает все подписки в память
**Проблема:** `listAllEnabled()` загружает все активные подписки сразу.

**Файлы:**
- `src/processes/schedulers/subscription.scheduler.ts:64`

**Решение:** Использовать курсор или батчинг:
```typescript
async processSubscriptions() {
  const currentHourUtc = new Date().getUTCHours();
  
  // Использовать findMany с where и take для батчинга
  let skip = 0;
  const batchSize = 100;
  
  while (true) {
    const subscriptions = await this.subscriptionService.listEnabledForHour(
      currentHourUtc,
      { skip, take: batchSize }
    );
    
    if (subscriptions.length === 0) break;
    
    for (const sub of subscriptions) {
      await this.sendSubscriptionNotification(sub);
    }
    
    skip += batchSize;
  }
}
```

---

## 📚 Документация

### 🟡 Средний приоритет

#### 29. README не полностью соответствует коду
**Проблема:** 
- В README упоминается `.env.example`, но файла нет
- Не описаны все переменные окружения
- Нет инструкций по деплою

**Решение:** Обновить README с актуальной информацией.

#### 30. Отсутствует API документация
**Проблема:** Нет описания внутренних API (сервисов, репозиториев).

**Решение:** Добавить JSDoc комментарии или создать `docs/API.md`.

---

## 🗺️ Roadmap улучшений

### 🟢 Срочно (критично для production)

1. **Создать `.env.example`** — без этого невозможно настроить проект
2. **Исправить Dockerfile** — обновить Node.js версию и добавить правильную сборку Prisma
3. **Исправить Makefile** — правильное имя образа
4. **Убрать `any` типы** — заменить на конкретные типы для params подписок
5. **Добавить обработку ошибок в action handlers** — предотвратить незакрытые промисы
6. **Добавить валидацию env через zod** — строгая типизация конфигурации

**Оценка:** 4-6 часов

### 🟡 Средний приоритет (важно для качества)

7. **Рефакторинг FSD** — убрать зависимости features от processes
8. **Расширить DI контейнер** — добавить все сервисы
9. **Создать репозитории** — для всех сущностей БД
10. **Добавить кеширование** — для NASA API ответов
11. **Улучшить логирование** — единый logger с контекстом
12. **Добавить тесты** — покрыть критичные модули (ApodService, NasaApi, RateLimiter)
13. **Добавить валидацию ввода** — для пользовательских данных
14. **Обработка блокировок бота** — автоматическое отключение подписок
15. **Очистка старых логов** — scheduled task для NotificationLog

**Оценка:** 2-3 дня

### ⚪ Низкий приоритет (nice to have)

16. **Добавить docker-compose.yml** — для удобного запуска
17. **Добавить healthcheck** — для мониторинга
18. **Миграция на Redis** — для rate limiting и кеширования
19. **Добавить пагинацию** — для больших результатов
20. **Улучшить документацию** — API docs, deployment guide
21. **Добавить мониторинг** — метрики производительности
22. **Оптимизация БД** — индексы, партиционирование

**Оценка:** 1-2 недели

---

## 💡 Рекомендации по реализации

### Для FSD рефакторинга

1. Создать `shared/types/telegram.ts` с базовыми типами
2. Переместить обработчики из `features/subscriptions/` в `processes/bot/handlers/subscriptions/`
3. Оставить в `features/subscriptions/` только бизнес-логику (сервисы)

### Для тестирования

1. Начать с unit тестов для сервисов (ApodService, AsteroidsService)
2. Добавить интеграционные тесты для обработчиков
3. Использовать моки для внешних API (NASA, Telegram)

### Для производительности

1. Начать с in-memory кеша (node-cache) для NASA API
2. При росте нагрузки мигрировать на Redis
3. Добавить метрики для мониторинга производительности

---

## 📊 Метрики качества

- **Покрытие тестами:** ~5% (только SubscriptionService)
- **Использование `any`:** 17 мест
- **Циклические зависимости:** 0 (хорошо!)
- **Нарушения FSD:** 2 (features → processes)
- **Проблемы безопасности:** 3 (средний приоритет)

---

## ✅ Заключение

Проект имеет **хорошую архитектурную основу** и следует принципам FSD. Основные проблемы связаны с:
- Неполной реализацией DI
- Отсутствием тестов
- Недостаточной валидацией и обработкой ошибок
- Проблемами инфраструктуры (Docker, env)

После исправления критичных проблем (🟢 Срочно) проект будет готов к production. Средний приоритет улучшений повысит качество и поддерживаемость кода.

---

**Автор аудита:** AI Code Reviewer  
**Дата:** 2025-01-XX

