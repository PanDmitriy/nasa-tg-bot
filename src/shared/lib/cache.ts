import NodeCache from 'node-cache';

const cache = new NodeCache({ 
  stdTTL: 3600, // 1 час по умолчанию
  checkperiod: 600, // проверка каждые 10 минут
});

/**
 * Получает данные из кеша или выполняет fetcher и сохраняет результат
 */
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

/**
 * Очищает кеш по паттерну или полностью
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    const keys = cache.keys().filter(key => key.includes(pattern));
    cache.del(keys);
  } else {
    cache.flushAll();
  }
}

/**
 * Получает значение из кеша без выполнения fetcher
 */
export function getFromCache<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Сохраняет значение в кеш
 */
export function setCache<T>(key: string, value: T, ttl?: number): boolean {
  return cache.set(key, value, ttl);
}

