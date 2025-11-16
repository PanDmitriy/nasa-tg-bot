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
