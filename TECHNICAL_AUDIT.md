# Технический аудит проекта NASA Telegram Bot

**Дата:** 2025-01-XX  
**Версия проекта:** 1.0.0  
**Архитектура:** FSD-подобная (Feature-Sliced Design)

---

## A. Обзор — основные найденные улучшения

### Критические проблемы (требуют немедленного исправления):
1. **Дублирование обработчиков ошибок** — два разных файла с одинаковой функциональностью
2. **Необработанные Promise в точке входа** — `bot.start().then()` без `.catch()`
3. **Логическая ошибка в retry-механизме** — недостижимый код после цикла
4. **Утечки памяти** — сессии хранятся в памяти без очистки
5. **Отсутствие валидации конфигурации** — пустые токены могут привести к падению

### Важные проблемы (рекомендуется исправить):
6. **Неиспользуемый код** — типы и сущности Mars остались в проекте
7. **Несогласованная обработка ошибок** — разные подходы в разных хендлерах
8. **Отсутствие rate limiting** — нет защиты от спама запросов
9. **Проблемы с типами** — использование `any` и небезопасные приведения типов
10. **Отсутствие логирования** — только `console.log/error`, нет структурированного логгера

### Улучшения архитектуры:
11. **Нарушение FSD-принципов** — бизнес-логика в хендлерах
12. **Отсутствие слоя сервисов** — прямая работа с API из хендлеров
13. **Хардкод значений** — магические числа и строки в коде
14. **Отсутствие dependency injection** — создание зависимостей внутри классов

---

## B. Детали по проблемам

### Проблема #1: Дублирование обработчиков ошибок
**Локация:**
- `src/shared/lib/errorHandler.ts` (старый, неиспользуемый)
- `src/shared/lib/errorHandler/errorHandler.ts` (используется только в `src/features/nasa/api.ts`)

**Описание:**
Существуют два разных класса для обработки ошибок:
- `ErrorHandler` (старый) — используется только в `src/features/nasa/api.ts`
- `errorHandler` (новый) — экспортируется, но не используется нигде

**Проблема:**
- Дублирование кода
- Несогласованность в обработке ошибок
- Путаница при разработке

**Решение:**
```typescript
// Удалить src/shared/lib/errorHandler.ts
// Использовать единый errorHandler из errorHandler/errorHandler.ts
// Обновить импорты во всех файлах
```

---

### Проблема #2: Необработанные Promise в точке входа
**Локация:** `src/app/index.ts:26-31`

**Код:**
```typescript
bot.start().then(() => {
  const telegram = bot.getTelegram();
  notificationsService = new DonkiNotificationsService(telegram);
  notificationsService.start();
});
```

**Проблема:**
- Если `bot.start()` упадет с ошибкой, приложение продолжит работу
- Ошибка будет необработанной (unhandled promise rejection)
- `notificationsService` может остаться `null`, что приведет к ошибкам при завершении

**Решение:**
```typescript
bot.start()
  .then(() => {
    const telegram = bot.getTelegram();
    notificationsService = new DonkiNotificationsService(telegram);
    notificationsService.start();
  })
  .catch((error) => {
    console.error('Ошибка запуска бота:', error);
    process.exit(1);
  });
```

---

### Проблема #3: Логическая ошибка в retry-механизме
**Локация:** `src/shared/api/nasa.ts:16-39`

**Код:**
```typescript
protected async get<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const retriable = !status || status === 429 || (status >= 500 && status < 600);
        if (retriable && attempt < maxAttempts) {
          const backoffMs = 500 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`NASA API Error: ${status ? `${status} - ` : ''}${message}`);
      }
      throw error;
    }
  }
  // Should never reach here
  throw new Error('Unexpected error while requesting NASA API');
}
```

**Проблема:**
- Строка 37-38 недостижима — если цикл завершился без `return` или `throw`, это баг
- Логика retry не обрабатывает случай, когда все попытки исчерпаны, но ошибка не retriable
- При не-retriable ошибке (например, 400) сразу выбрасывается исключение, но цикл продолжается

**Решение:**
```typescript
protected async get<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const maxAttempts = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const retriable = !status || status === 429 || (status >= 500 && status < 600);
        
        // Если ошибка не retriable или это последняя попытка — выбрасываем сразу
        if (!retriable || attempt === maxAttempts) {
          const message = error.response?.data?.error?.message || error.message;
          throw new Error(`NASA API Error: ${status ? `${status} - ` : ''}${message}`);
        }
        
        // Retry с exponential backoff
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      
      // Не-Axios ошибка — выбрасываем сразу
      throw lastError;
    }
  }
  
  // Fallback (на самом деле недостижимо, но TypeScript требует)
  throw lastError || new Error('Unexpected error while requesting NASA API');
}
```

---

### Проблема #4: Утечки памяти — сессии в памяти
**Локация:** `src/processes/bot/index.ts:48`

**Код:**
```typescript
private sessions: Map<number, UserSession>;
```

**Проблема:**
- Сессии хранятся в памяти и никогда не очищаются
- При большом количестве пользователей память будет расти бесконечно
- При перезапуске бота все сессии теряются

**Решение:**
1. Использовать Redis для хранения сессий
2. Или добавить TTL и очистку старых сессий:
```typescript
private sessions: Map<number, { session: UserSession; lastAccess: Date }>;
private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

private cleanupOldSessions() {
  const now = Date.now();
  for (const [userId, data] of this.sessions.entries()) {
    if (now - data.lastAccess.getTime() > this.SESSION_TTL_MS) {
      this.sessions.delete(userId);
    }
  }
}

// Вызывать cleanupOldSessions() периодически (например, каждые 10 минут)
```

---

### Проблема #5: Отсутствие валидации конфигурации
**Локация:** `src/app/config/development.ts`, `src/app/index.ts`

**Проблема:**
- Если `TELEGRAM_BOT_TOKEN` или `NASA_API_KEY` не установлены, бот упадет с неясной ошибкой
- Нет проверки на пустые строки

**Решение:**
```typescript
// src/app/config/development.ts
export const developmentConfig: Config = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    // ...
  },
  nasa: {
    apiKey: process.env.NASA_API_KEY || '',
    baseUrl: 'https://api.nasa.gov'
  },
  // ...
};

// Добавить валидацию в src/app/index.ts
function validateConfig() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
  }
  if (!process.env.NASA_API_KEY) {
    throw new Error('NASA_API_KEY не установлен в переменных окружения');
  }
}

validateConfig();
const bot = new Bot();
```

---

### Проблема #6: Неиспользуемый код — типы Mars
**Локация:**
- `src/entities/user/types.ts` — содержит `MarsPhoto[]`
- `src/entities/photo/types.ts` — содержит `MarsPhoto`
- Комментарий в `src/processes/bot/index.ts:8` говорит об удалении Mars feature

**Проблема:**
- Мертвый код увеличивает размер проекта
- Может вводить в заблуждение разработчиков

**Решение:**
Удалить неиспользуемые типы и интерфейсы, связанные с Mars.

---

### Проблема #7: Несогласованная обработка ошибок
**Локация:** Разные хендлеры (`apod.ts`, `earth.ts`, `images.ts`, `donki.ts`)

**Проблема:**
- В `apod.ts` — детальная обработка разных типов ошибок
- В `earth.ts` — упрощенная обработка
- В `images.ts` — минимальная обработка
- В `donki.ts` — только `console.error` и общее сообщение

**Решение:**
Создать единый middleware для обработки ошибок:
```typescript
// src/shared/lib/errorHandler/telegramErrorHandler.ts
export async function handleTelegramError(
  ctx: Context & BotContext,
  error: unknown,
  context: string
): Promise<void> {
  console.error(`${context} Error:`, error);
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Определяем тип ошибки и отправляем соответствующее сообщение
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    await ctx.reply('⏱️ Превышено время ожидания ответа от NASA API. Пожалуйста, попробуйте позже.');
  } else if (errorMessage.includes('NASA API Error: 429')) {
    await ctx.reply('⚠️ Превышен лимит запросов NASA (429). Подождите немного и повторите.');
  } else if (errorMessage.includes('NASA API Error: 5')) {
    await ctx.reply('⚠️ Сервис NASA временно недоступен (5xx). Попробуйте позже.');
  } else {
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}
```

---

### Проблема #8: Отсутствие rate limiting
**Локация:** Все хендлеры

**Проблема:**
- Пользователь может спамить командами
- Нет защиты от злоупотребления API
- Может привести к блокировке API ключа

**Решение:**
Добавить middleware для rate limiting:
```typescript
// src/shared/lib/rateLimiter.ts
import { BotContext } from '../../processes/bot/types';

const userRequests = new Map<number, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута
const MAX_REQUESTS_PER_WINDOW = 10;

export function rateLimitMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userRequestsList = userRequests.get(userId) || [];
    
    // Удаляем старые запросы
    const recentRequests = userRequestsList.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      await ctx.reply('⚠️ Слишком много запросов. Подождите немного.');
      return;
    }

    recentRequests.push(now);
    userRequests.set(userId, recentRequests);
    
    return next();
  };
}
```

---

### Проблема #9: Проблемы с типами
**Локация:** Множество файлов

**Примеры:**
- `src/processes/bot/handlers/images.ts:54` — `(ctx.callbackQuery as any)?.data`
- `src/processes/bot/handlers/donki.ts:752` — `catch (error: any)`
- `src/processes/bot/handlers/earth.ts:52` — `(ctx.callbackQuery as any)?.data`

**Проблема:**
- Использование `any` отключает проверку типов
- Может привести к runtime ошибкам

**Решение:**
Создать правильные типы для callback queries:
```typescript
// src/processes/bot/types.ts
export interface CallbackQueryData {
  data: string;
  // другие поля
}

export function getCallbackQueryData(ctx: BotContext): string | null {
  if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
    return ctx.callbackQuery.data;
  }
  return null;
}
```

---

### Проблема #10: Отсутствие структурированного логирования
**Локация:** Весь проект

**Проблема:**
- Используется только `console.log` и `console.error`
- Нет уровней логирования
- Нет структурированных логов
- Сложно отслеживать проблемы в production

**Решение:**
Внедрить библиотеку логирования (например, `winston` или `pino`):
```typescript
// src/shared/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

---

### Проблема #11: Нарушение FSD-принципов — бизнес-логика в хендлерах
**Локация:** Все хендлеры

**Проблема:**
- Хендлеры содержат бизнес-логику (форматирование, валидацию)
- Нарушается принцип разделения ответственности
- Сложно тестировать

**Решение:**
Вынести бизнес-логику в сервисы:
```typescript
// src/features/apod/services/apodService.ts
export class ApodService {
  constructor(private apodApi: ApodApi) {}

  async getRandomApod(): Promise<ApodResponse> {
    const randomDate = this.generateRandomDate();
    return this.apodApi.getApod(randomDate);
  }

  private generateRandomDate(): string {
    // логика генерации даты
  }
}

// В хендлере только координация
export async function handleAPOD(ctx: Context & BotContext) {
  const service = new ApodService(apodApi);
  const apod = await service.getRandomApod();
  // отправка сообщения
}
```

---

### Проблема #12: Отсутствие слоя сервисов
**Локация:** Хендлеры напрямую работают с API

**Проблема:**
- Хендлеры знают о деталях API
- Сложно мокировать для тестов
- Дублирование логики

**Решение:**
Создать слой сервисов между хендлерами и API.

---

### Проблема #13: Хардкод значений
**Локация:** Множество файлов

**Примеры:**
- `src/processes/bot/handlers/apod.ts:16` — `new Date('2025-10-01')` — хардкод даты
- `src/processes/notifications/donki-notifications.ts:21` — `15 * 60 * 1000` — интервал проверки
- `src/shared/api/nasa.ts:11` — `timeout: 30000` — таймаут

**Решение:**
Вынести в конфигурацию:
```typescript
// src/app/config/index.ts
export const config = {
  // ...
  apod: {
    startDate: '1995-06-16',
    endDate: new Date().toISOString().split('T')[0], // текущая дата
  },
  donki: {
    checkIntervalMs: 15 * 60 * 1000,
  },
  api: {
    timeout: 30000,
    maxRetries: 3,
  },
};
```

---

### Проблема #14: Отсутствие dependency injection
**Локация:** Классы создают зависимости внутри себя

**Проблема:**
- Сложно тестировать
- Сложно менять реализации
- Нарушение принципа инверсии зависимостей

**Решение:**
Использовать dependency injection:
```typescript
// Вместо создания внутри класса
const apodApi = new ApodApi(config.nasa.apiKey);

// Передавать через конструктор
export class ApodService {
  constructor(private apodApi: ApodApi) {}
}
```

---

## C. Рекомендации по архитектуре/структуре

### 1. Улучшение структуры FSD

**Текущая структура:**
```
src/
  app/          # Конфигурация
  entities/     # Сущности
  features/     # Фичи (API клиенты)
  processes/    # Процессы (бот, уведомления)
  shared/       # Общие модули
```

**Рекомендуемая структура:**
```
src/
  app/          # Точка входа, конфигурация
  entities/     # Сущности (User, Photo, etc.)
  features/     # Фичи (apod, donki, earth, etc.)
    apod/
      api/      # API клиент
      services/ # Бизнес-логика
      ui/       # UI компоненты (форматеры)
      model/    # Типы и интерфейсы
  processes/    # Процессы (bot, notifications)
  shared/       # Общие модули
    api/        # Базовые API клиенты
    db/         # База данных
    lib/        # Утилиты
    ui/         # Общие UI компоненты
```

### 2. Создание слоя сервисов

Вынести бизнес-логику из хендлеров в сервисы:
- `ApodService` — логика работы с APOD
- `DonkiService` — логика работы с DONKI
- `ImagesService` — логика работы с изображениями

### 3. Единая обработка ошибок

Создать middleware для обработки ошибок на уровне бота:
```typescript
bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    await handleTelegramError(ctx, error, 'Handler');
  }
});
```

### 4. Конфигурация через переменные окружения

Использовать библиотеку для валидации конфигурации (например, `zod`):
```typescript
import { z } from 'zod';

const configSchema = z.object({
  bot: z.object({
    token: z.string().min(1),
  }),
  nasa: z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url(),
  }),
});

export const config = configSchema.parse({
  bot: { token: process.env.TELEGRAM_BOT_TOKEN },
  nasa: { apiKey: process.env.NASA_API_KEY, baseUrl: 'https://api.nasa.gov' },
});
```

### 5. Тестирование

Добавить unit-тесты для сервисов и интеграционные тесты для API:
- Использовать `jest` или `vitest`
- Мокировать API запросы
- Тестировать обработку ошибок

---

## D. Заключение — приоритеты исправления

### Критично (исправить немедленно):
1. ✅ **Проблема #2** — Необработанные Promise в точке входа
2. ✅ **Проблема #3** — Логическая ошибка в retry-механизме
3. ✅ **Проблема #5** — Отсутствие валидации конфигурации

### Высокий приоритет (исправить в ближайшее время):
4. ✅ **Проблема #1** — Дублирование обработчиков ошибок
5. ✅ **Проблема #4** — Утечки памяти (сессии)
6. ✅ **Проблема #7** — Несогласованная обработка ошибок
7. ✅ **Проблема #8** — Отсутствие rate limiting

### Средний приоритет (улучшить при возможности):
8. ✅ **Проблема #6** — Неиспользуемый код
9. ✅ **Проблема #9** — Проблемы с типами
10. ✅ **Проблема #10** — Отсутствие структурированного логирования
11. ✅ **Проблема #13** — Хардкод значений

### Низкий приоритет (рефакторинг):
12. ✅ **Проблема #11** — Нарушение FSD-принципов
13. ✅ **Проблема #12** — Отсутствие слоя сервисов
14. ✅ **Проблема #14** — Отсутствие dependency injection

---

**Общая оценка:** Проект имеет хорошую структуру и следует принципам FSD, но требует улучшения обработки ошибок, валидации и масштабируемости. Большинство проблем можно решить без кардинальных изменений архитектуры.

