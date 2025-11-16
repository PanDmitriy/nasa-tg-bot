import { z } from 'zod';
import { logger } from '../../shared/logger';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  NASA_API_KEY: z.string().min(1, 'NASA_API_KEY is required'),
  DATABASE_URL: z.string().default('file:./data/bot.db'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  WEBPAY_STORE_ID: z.string().optional(),
  WEBPAY_SECRET_KEY: z.string().optional(),
  WEBPAY_WEBHOOK_SECRET: z.string().optional(),
  WEBPAY_TEST_MODE: z.string().optional(),
  WEBPAY_API_URL: z.string().optional(),
  WEBPAY_TEST_URL: z.string().optional(),
  PREMIUM_PRICE_BYN: z.string().optional(),
  DOMAIN_URL: z.string().default('http://localhost:3000'),
  WEBHOOK_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Ошибки конфигурации');
      error.errors.forEach((err) => {
        logger.error('Конфигурация: некорректное значение', undefined, {
          path: err.path.join('.'),
          message: err.message,
        });
      });
    }
    process.exit(1);
  }
}

