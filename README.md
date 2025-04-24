# NASA Telegram Bot

Telegram бот для получения информации о космосе, фотографий с марсоходов, МКС и других космических данных через NASA API.

## Описание

Этот проект представляет собой Telegram бота, написанного на TypeScript, который предоставляет доступ к различным API NASA и другим космическим данным. Бот использует современный стек технологий и следует лучшим практикам разработки.

## Технологии

- TypeScript
- Node.js
- Telegraf (Telegram Bot Framework)
- Axios (HTTP клиент)
- ESLint & Prettier (Линтинг и форматирование)
- Docker (Контейнеризация)

## Требования

- Node.js (версия 14 или выше)
- npm или yarn
- Docker (опционально, для контейнеризации)

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/PanDmitriy/nasa-tg-bot
```

```bash
cd nasa-tg-bot
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example` и заполните необходимые переменные окружения:
```bash
cp .env.example .env
```

4. Отредактируйте файл `.env`, добавив:
- TELEGRAM_BOT_TOKEN - токен вашего Telegram бота
- NASA_API_KEY - API ключ NASA

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

### Docker
```bash
docker build -t nasa-tg-bot .
docker run -d --env-file .env nasa-tg-bot
```

## Структура проекта

```
src/
├── app/          # Основной код приложения
├── entities/     # Бизнес-сущности
├── features/     # Функциональные модули
├── processes/    # Бизнес-процессы
└── shared/       # Общие утилиты и конфигурации
```

## Скрипты

- `npm start` - запуск собранного приложения
- `npm run build` - сборка TypeScript кода
- `npm run dev` - запуск в режиме разработки
- `npm run lint` - проверка кода линтером
- `npm run format` - форматирование кода

## Лицензия

ISC