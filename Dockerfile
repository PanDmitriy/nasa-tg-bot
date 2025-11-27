# Multi-stage build для оптимизации размера образа

# Stage 1: Сборка
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Генерируем Prisma client
# DATABASE_URL нужен только для конфигурации, но не для генерации клиента
# Используем фиктивное значение для сборки
ENV DATABASE_URL="file:./data/bot.db"
RUN npm run db:generate

# Собираем проект
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Устанавливаем только production зависимости
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npm cache clean --force

# Копируем собранный код и сгенерированный Prisma client из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Копируем entrypoint скрипт
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Создаем директорию для базы данных
RUN mkdir -p /app/data

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Используем entrypoint скрипт для правильной обработки сигналов
ENTRYPOINT ["/app/docker-entrypoint.sh"]
