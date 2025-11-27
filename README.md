# NASA Telegram Bot

Telegram бот для получения информации о космосе, фотографий NASA, снимков Земли, данных о космической погоде и других космических данных через NASA API.

## Описание

Этот проект представляет собой Telegram бота, написанного на TypeScript, который предоставляет доступ к различным API NASA и данным о космической погоде. Бот использует современный стек технологий, следует принципам Feature-Sliced Design (FSD) архитектуры и лучшим практикам разработки.

## Возможности

- 📸 **APOD (Astronomy Picture of the Day)** - случайные фотографии космоса от NASA из архива с 1995 года
- 🌍 **Снимки Земли** - актуальные фотографии Земли из космоса (Natural и Enhanced режимы)
- ☄️ **Астероиды** - информация о ближайших к Земле астероидах за последние 7 дней
- 🖼️ **Галерея изображений** - поиск и просмотр изображений из архива NASA по различным темам с навигацией
- 🌌 **DONKI (Космическая погода)** - данные о событиях космической погоды:
  - Корональные выбросы массы (CME)
  - Солнечные вспышки
  - Солнечные энергичные частицы (SEP)
  - Геомагнитные бури (GST)
  - Межпланетные удары (IPS)
  - Уведомления и симуляции WSA-ENLIL
  - Подписки на уведомления о событиях с автоматической рассылкой

## Технологии

- **TypeScript** - типизированный JavaScript
- **Node.js** - серверная платформа
- **Telegraf** - Telegram Bot Framework
- **Axios** - HTTP клиент с автоматическими retry и обработкой ошибок
- **Prisma** - ORM для работы с базой данных
- **SQLite** - База данных для хранения подписок
- **WebPay** - Платежная система для Premium подписок
- **Express** - HTTP сервер для WebPay webhooks
- **ESLint & Prettier** - Линтинг и форматирование кода
- **Docker** - Контейнеризация приложения

## Архитектура

Проект следует принципам **Feature-Sliced Design (FSD)**:

- **app/** - Конфигурация и точка входа приложения
- **entities/** - Бизнес-сущности (типы данных)
- **features/** - Функциональные модули (API клиенты, сервисы, форматтеры)
- **processes/** - Бизнес-процессы (бот, уведомления)
- **shared/** - Общие утилиты (DI контейнер, обработка ошибок, rate limiting)

### Ключевые особенности архитектуры:

- ✅ **Dependency Injection** - централизованное управление зависимостями через DI контейнер
- ✅ **Слой сервисов** - бизнес-логика вынесена из хендлеров в сервисы
- ✅ **Обработка ошибок** - единый middleware для обработки ошибок
- ✅ **Rate Limiting** - защита от спама (20 команд/мин, 60 действий/мин для галерей)
- ✅ **Управление сессиями** - автоматическая очистка устаревших сессий
- ✅ **Retry механизм** - автоматические повторы запросов к API с exponential backoff

## Требования

- Node.js (версия 18 или выше)
- npm или yarn
- Docker (опционально, для контейнеризации)
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))
- NASA API Key (получить на [api.nasa.gov](https://api.nasa.gov/))

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/PanDmitriy/nasa-tg-bot
cd nasa-tg-bot
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` в корне проекта на основе `.env.example`:
```bash
cp .env.example .env
```

Затем отредактируйте `.env` и заполните обязательные переменные:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NASA_API_KEY=your_nasa_api_key
DATABASE_URL=file:./data/bot.db
NODE_ENV=development
```

### Переменные окружения

#### Обязательные переменные:
- `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота (получить у [@BotFather](https://t.me/BotFather))
- `NASA_API_KEY` - API ключ NASA (получить на [api.nasa.gov](https://api.nasa.gov/))
- `DATABASE_URL` - путь к файлу базы данных SQLite (по умолчанию `file:./data/bot.db`)

#### Опциональные переменные:
- `NODE_ENV` - окружение (`development`/`production`), по умолчанию `development`

#### WebPay (Premium подписка):
- `WEBPAY_STORE_ID` - ID магазина WebPay для включения Premium функций. Получить в личном кабинете [webpay.by](https://webpay.by/)
- `WEBPAY_SECRET_KEY` - секретный ключ WebPay для подписи запросов. Получить в личном кабинете [webpay.by](https://webpay.by/)
- `WEBPAY_WEBHOOK_SECRET` - секрет webhook для верификации WebPay событий (рекомендуется для production)
- `WEBPAY_TEST_MODE` - режим тестирования (`true`/`false`). По умолчанию `false`
- `WEBPAY_API_URL` - URL API WebPay для production (опционально)
- `WEBPAY_TEST_URL` - URL API WebPay для тестирования (опционально)
- `PREMIUM_PRICE_BYN` - цена Premium подписки в копейках BYN (по умолчанию `3000` = 30.00 BYN)
- `DOMAIN_URL` - домен для WebPay платежей (по умолчанию `http://localhost:3000`). Используется для redirect URL после оплаты
- `WEBHOOK_PORT` - порт для webhook сервера WebPay (по умолчанию `3000`). Webhook сервер запускается только если установлены `WEBPAY_STORE_ID` и `WEBPAY_SECRET_KEY`

> **Примечание:** Redis в текущей версии не используется. Все данные хранятся в SQLite базе данных.

4. Инициализируйте базу данных:
```bash
npm run db:generate
npm run db:migrate
```

## Запуск

### Разработка
```bash
npm run dev
```

### Сборка и запуск
```bash
npm run build
npm start
```

### Docker Compose (рекомендуется)

Самый простой способ запуска проекта:

1. Убедитесь, что создан файл `.env` с необходимыми переменными окружения (см. раздел "Переменные окружения")

2. Создайте директорию для базы данных (если её нет):
```bash
mkdir -p data
```

3. Запустите проект:
```bash
# Запуск в фоновом режиме
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Пересборка и запуск
docker-compose up -d --build
```

**Примечание:** 
- База данных SQLite будет храниться в директории `./data` на хосте, что обеспечивает персистентность данных между перезапусками контейнера.
- Перед первым запуском в Docker необходимо применить миграции базы данных. Это можно сделать двумя способами:
  1. **Локально перед запуском контейнера:**
     ```bash
     npm install
     npm run db:generate
     npm run db:migrate
     ```
  2. **Внутри контейнера (временный контейнер для миграций):**
     ```bash
     docker-compose run --rm nasa-tg-bot sh -c "npm install && npm run db:generate && npm run db:migrate"
     ```

### Docker (без Compose)

Если вы предпочитаете использовать Docker напрямую:

```bash
# Сборка образа
docker build -t nasa-tg-bot .

# Запуск контейнера
docker run -d \
  --name nasa-tg-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -p 3000:3000 \
  --restart unless-stopped \
  nasa-tg-bot

# Просмотр логов
docker logs -f nasa-tg-bot

# Остановка
docker stop nasa-tg-bot
docker rm nasa-tg-bot
```

**Важно:** Убедитесь, что директория `data/` существует и доступна для записи, так как в ней будет храниться база данных SQLite.

## Команды бота

- `/start` - Начать работу с ботом
- `/apod` - Получить случайную фотографию дня от NASA
- `/earth` - Получить снимок Земли из космоса (с выбором режима Natural/Enhanced)
- `/asteroids` - Получить информацию о ближайших астероидах за последние 7 дней
- `/images` - Галерея изображений NASA
  - Выбор популярной темы из меню
  - Поиск по запросу: `/images Jupiter`
  - Навигация по результатам поиска
- `/donki` - Космическая погода (DONKI)
  - Просмотр событий космической погоды (CME, вспышки, SEP, GST, IPS)
  - Подписки на уведомления о событиях
  - Простой и подробный режимы отображения
- `/premium` - Premium подписка (требует настройки WebPay)
- `/help` - Показать справку по командам

## Структура проекта

```
src/
├── app/                    # Конфигурация и точка входа
│   ├── config/            # Конфигурационные файлы (development, production)
│   ├── index.ts           # Точка входа приложения с валидацией конфигурации
│   └── types/             # Типы конфигурации
├── entities/              # Бизнес-сущности
│   ├── location/          # Типы локаций
│   ├── photo/            # Типы фотографий
│   └── user/             # Типы пользователей
├── features/             # Функциональные модули (FSD)
│   ├── apod/             # APOD функциональность
│   │   ├── api/          # API клиент
│   │   └── services/     # Бизнес-логика (ApodService)
│   ├── asteroids/        # Астероиды функциональность
│   │   ├── api/          # API клиент
│   │   └── services/     # Бизнес-логика (AsteroidsService)
│   ├── donki/            # DONKI функциональность
│   │   ├── api/          # API клиент
│   │   └── formatters.ts # Форматтеры для отображения данных
│   ├── earth/            # Earth функциональность
│   │   └── api/          # API клиент
│   ├── images/           # Images функциональность
│   │   └── api/          # API клиент
│   └── nasa/             # Базовый NASA API клиент
│       ├── api.ts        # Базовый класс API
│       └── formatters.ts # Форматтеры
├── processes/            # Бизнес-процессы
│   ├── bot/              # Telegram бот
│   │   ├── handlers/     # Обработчики команд и действий
│   │   ├── index.ts      # Класс бота с middleware
│   │   └── types.ts      # Типы бота и сессий
│   └── notifications/    # Сервисы уведомлений
│       └── donki-notifications.ts  # Автоматические уведомления о событиях DONKI
└── shared/               # Общие утилиты
    ├── api/              # Базовые API клиенты (NasaApi с retry)
    ├── db/               # Работа с базой данных
    │   ├── prisma.ts     # Prisma клиент
    │   └── repositories/ # Репозитории (SubscriptionsRepository)
    ├── di/               # Dependency Injection
    │   └── container.ts  # DI контейнер для управления зависимостями
    ├── lib/              # Библиотеки
    │   ├── errorHandler/ # Обработка ошибок
    │   ├── rateLimiter.ts # Rate limiting middleware
    │   └── telegramHelpers.ts # Вспомогательные функции для Telegram
    └── ui/               # UI компоненты
        └── keyboard.ts   # Клавиатуры для бота
```

## Скрипты

- `npm start` - запуск собранного приложения
- `npm run build` - сборка TypeScript кода в JavaScript
- `npm run dev` - запуск в режиме разработки с hot-reload
- `npm run lint` - проверка кода линтером ESLint
- `npm run format` - форматирование кода с помощью Prettier
- `npm run db:generate` - генерация Prisma клиента
- `npm run db:migrate` - применение миграций базы данных
- `npm run db:studio` - запуск Prisma Studio для просмотра данных

## Разработка

Проект использует **Feature-Sliced Design (FSD)** архитектуру для организации кода. Каждый функциональный модуль изолирован и может быть легко расширен или изменен.

### Архитектурные принципы

- **Разделение ответственности** - бизнес-логика в сервисах, хендлеры только координируют
- **Dependency Injection** - зависимости управляются через DI контейнер
- **Обработка ошибок** - единый middleware для всех ошибок
- **Rate Limiting** - защита от злоупотреблений API
- **Retry механизм** - автоматические повторы при сбоях API

### База данных

Проект использует Prisma ORM с SQLite базой данных. База данных хранится в файле `data/bot.db` и используется для:
- Хранения информации о пользователях
- Управления подписками на уведомления DONKI

### Система уведомлений

Бот включает систему автоматических уведомлений о событиях космической погоды (DONKI). Пользователи могут подписываться на различные типы событий и получать уведомления в реальном времени:
- CME события (с фильтрацией по уровню опасности)
- Уведомления DONKI
- Симуляции WSA-ENLIL

### Настройка WebPay (Premium подписка)

Для включения Premium функций и оплаты через WebPay:

1. Создайте аккаунт на [webpay.by](https://webpay.by/)
2. Получите `WEBPAY_STORE_ID` и `WEBPAY_SECRET_KEY` в личном кабинете WebPay
3. Добавьте в `.env`:
   ```env
   WEBPAY_STORE_ID=your_store_id
   WEBPAY_SECRET_KEY=your_secret_key
   DOMAIN_URL=https://your-domain.com  # или http://localhost:3000 для разработки
   PREMIUM_PRICE_BYN=3000  # 30.00 BYN в копейках
   ```

#### Настройка Webhook (для production)

Для автоматической активации Premium подписок после оплаты:

1. Настройте webhook endpoint в личном кабинете WebPay
2. Укажите URL: `https://your-domain.com/api/payments/webhook`
3. Получите Webhook Secret и добавьте в `.env`:
   ```env
   WEBPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

4. Настройте порт webhook сервера (опционально):
   ```env
   WEBHOOK_PORT=3000
   ```

5. Для тестирования включите тестовый режим:
   ```env
   WEBPAY_TEST_MODE=true
   ```

**Важно:**
- Webhook сервер запускается автоматически при наличии `WEBPAY_STORE_ID` и `WEBPAY_SECRET_KEY`
- В development режиме верификация подписи может быть отключена (не рекомендуется для production)
- Убедитесь, что `DOMAIN_URL` доступен из интернета для работы webhook
- WebPay принимает платежи в белорусских рублях (BYN)

### Добавление новой функции

1. Создайте новый модуль в `src/features/[feature-name]/`
   - `api/` - API клиент
   - `services/` - бизнес-логика (если требуется)
2. Добавьте сервис в DI контейнер (`src/shared/di/container.ts`)
3. Создайте обработчик в `src/processes/bot/handlers/`
4. Зарегистрируйте команду в `src/processes/bot/index.ts`
5. При необходимости добавьте модели в `prisma/schema.prisma` и выполните миграцию

### Тестирование

Для тестирования можно использовать методы DI контейнера для замены зависимостей:
```typescript
import { container } from './shared/di/container';

// В тестах
const mockApi = new MockApodApi();
container.setApodApi(mockApi);
```

## Производительность и масштабируемость

- **Rate Limiting**: 20 команд/мин, 60 действий/мин для callback queries
- **Управление сессиями**: автоматическая очистка устаревших сессий (TTL 24 часа)
- **Retry механизм**: автоматические повторы при сбоях API (до 3 попыток)
- **Обработка ошибок**: единый middleware для всех типов ошибок

## Лицензия

ISC
