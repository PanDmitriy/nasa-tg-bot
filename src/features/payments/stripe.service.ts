import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  telegramId: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor(secretKey?: string) {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    this.stripe = new Stripe(key, {
      apiVersion: '2025-10-29.clover',
    });
  }

  /**
   * Создает Stripe Checkout Session для оплаты Premium
   */
  async createCheckoutSession({ telegramId }: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    const domainUrl = process.env.DOMAIN_URL || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'NASA Bot Premium',
              description: 'Premium подписка на NASA Telegram Bot',
            },
            unit_amount: 999, // $9.99 в центах
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${domainUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&telegram_id=${telegramId}`,
      cancel_url: `${domainUrl}/payment/cancel?telegram_id=${telegramId}`,
      metadata: {
        telegramId,
      },
      client_reference_id: telegramId,
    });

    return session;
  }

  /**
   * Получает сессию по ID
   */
  async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }
}

