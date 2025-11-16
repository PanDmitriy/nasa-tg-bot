/**
 * Валидаторы для пользовательского ввода
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Валидация часа UTC (0-23)
 */
export function validateHourUtc(hour: number): ValidationResult {
  if (!Number.isInteger(hour)) {
    return { valid: false, error: 'Час должен быть целым числом' };
  }
  if (hour < 0 || hour > 23) {
    return { valid: false, error: 'Час должен быть от 0 до 23' };
  }
  return { valid: true };
}

/**
 * Валидация поискового запроса
 */
export function validateSearchQuery(query: string): ValidationResult {
  const trimmed = query.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Запрос должен содержать минимум 2 символа' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Запрос не должен превышать 100 символов' };
  }
  
  // Проверка на наличие только спецсимволов или пробелов
  if (!/[a-zA-Zа-яА-Я0-9]/.test(trimmed)) {
    return { valid: false, error: 'Запрос должен содержать хотя бы одну букву или цифру' };
  }
  
  return { valid: true };
}

/**
 * Валидация строки как числа
 */
export function validateNumberString(value: string): ValidationResult {
  const trimmed = value.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Значение не может быть пустым' };
  }
  
  const num = Number(trimmed);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Значение должно быть числом' };
  }
  
  return { valid: true };
}

