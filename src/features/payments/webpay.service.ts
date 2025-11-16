import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface CreateCheckoutSessionParams {
  telegramId: string;
}

export interface WebPayCheckoutSession {
  id: string;
  url: string;
  status: string;
}

export interface WebPayPaymentResponse {
  orderId: string;
  formUrl: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Сервис для работы с WebPay платежной системой
 * Документация: https://webpay.by/
 */
export class WebPayService {
  private apiClient: AxiosInstance;
  private wsbStoreId: string;
  private wsbSecretKey: string;
  private wsbTestMode: boolean;

  constructor(config?: {
    storeId?: string;
    secretKey?: string;
    testMode?: boolean;
  }) {
    this.wsbStoreId = config?.storeId || process.env.WEBPAY_STORE_ID || '';
    this.wsbSecretKey = config?.secretKey || process.env.WEBPAY_SECRET_KEY || '';
    this.wsbTestMode = config?.testMode ?? process.env.WEBPAY_TEST_MODE === 'true';

    if (!this.wsbStoreId) {
      throw new Error('WEBPAY_STORE_ID is not set in environment variables');
    }
    if (!this.wsbSecretKey) {
      throw new Error('WEBPAY_SECRET_KEY is not set in environment variables');
    }

    // WebPay API endpoint (обычно это их платежный шлюз)
    const apiUrl = this.wsbTestMode
      ? process.env.WEBPAY_TEST_URL || 'https://securesandbox.webpay.by'
      : process.env.WEBPAY_API_URL || 'https://payment.webpay.by';

    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Создает платежную сессию для оплаты Premium подписки
   */
  async createCheckoutSession({ telegramId }: CreateCheckoutSessionParams): Promise<WebPayCheckoutSession> {
    const domainUrl = process.env.DOMAIN_URL || 'http://localhost:3000';
    
    // Генерируем уникальный номер заказа
    const orderId = `premium_${telegramId}_${Date.now()}`;
    
    // Сумма в копейках (BYN) - 9.99 USD примерно равно 30 BYN
    // Для подписки на месяц используем фиксированную сумму
    const amount = parseInt(process.env.PREMIUM_PRICE_BYN || '3000', 10); // 30.00 BYN в копейках

    // Параметры для создания платежа в WebPay
    const paymentParams = {
      storeid: this.wsbStoreId,
      order_num: orderId,
      currency_id: 'BYN', // Белорусские рубли
      amount: amount,
      signature: this.generateSignature(orderId, amount),
      test: this.wsbTestMode ? 1 : 0,
      lang: 'ru',
      wsb_invoice_item_name: 'NASA Bot Premium',
      wsb_invoice_item_quantity: 1,
      wsb_invoice_item_price: amount,
      wsb_return_url: `${domainUrl}/payment/success?order_id={ORDER_ID}&telegram_id=${telegramId}`,
      wsb_cancel_return_url: `${domainUrl}/payment/cancel?telegram_id=${telegramId}`,
      wsb_notify_url: `${domainUrl}/api/payments/webhook`,
      wsb_customer_name: `Telegram User ${telegramId}`,
      wsb_email: '', // Можно оставить пустым или использовать email пользователя если есть
      wsb_phone: '', // Можно оставить пустым
      wsb_custom_telegram_id: telegramId, // Кастомное поле для хранения telegramId
    };

    try {
      // WebPay обычно использует POST запрос для создания платежа
      // Формат может отличаться в зависимости от версии API
      const response = await this.apiClient.post<WebPayPaymentResponse>('/api/v1/payment', paymentParams);

      if (response.data.errorCode) {
        throw new Error(`WebPay error: ${response.data.errorMessage || response.data.errorCode}`);
      }

      if (!response.data.formUrl) {
        throw new Error('WebPay did not return payment form URL');
      }

      return {
        id: response.data.orderId,
        url: response.data.formUrl,
        status: 'pending',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`WebPay API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Генерирует подпись для запроса (требуется для безопасности WebPay)
   */
  private generateSignature(orderId: string, amount: number): string {
    // Формат подписи может отличаться в зависимости от версии WebPay API
    // Обычно это SHA1 или SHA256 хеш от конкатенации параметров
    const signatureString = `${this.wsbStoreId}${orderId}${amount}${this.wsbSecretKey}`;
    return crypto.createHash('sha1').update(signatureString).digest('hex');
  }

  /**
   * Проверяет подпись webhook от WebPay
   */
  verifyWebhookSignature(data: Record<string, any>, signature: string): boolean {
    // Формат проверки подписи зависит от WebPay API
    // Обычно это хеш от конкатенации параметров
    const signatureString = `${data.order_id || ''}${data.amount || ''}${data.status || ''}${this.wsbSecretKey}`;
    const calculatedSignature = crypto.createHash('sha1').update(signatureString).digest('hex');
    return calculatedSignature === signature;
  }

  /**
   * Получает информацию о платеже по ID заказа
   */
  async getPaymentStatus(orderId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
  }> {
    try {
      const response = await this.apiClient.get(`/api/v1/payment/${orderId}`, {
        params: {
          storeid: this.wsbStoreId,
          signature: this.generateSignature(orderId, 0),
        },
      });

      return {
        status: response.data.status || 'unknown',
        amount: response.data.amount || 0,
        currency: response.data.currency || 'BYN',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`WebPay API error: ${error.message}`);
      }
      throw error;
    }
  }
}

