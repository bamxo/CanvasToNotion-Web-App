export const LIFETIME_REFUND_WINDOW_DAYS = 7;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const stripeSecretKey = (): string => required('STRIPE_SECRET_KEY');
export const stripeWebhookSecret = (): string => required('STRIPE_WEBHOOK_SECRET');
export const stripePriceProMonthly = (): string => required('STRIPE_PRICE_PRO_MONTHLY');
export const stripePriceLifetime = (): string => required('STRIPE_PRICE_LIFETIME');

export const appBaseUrl = (): string =>
  (
    process.env.APP_BASE_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://canvastonotion.io'
      : 'http://localhost:5173')
  ).replace(/\/+$/, '');

export const nowIso = (): string => new Date().toISOString();
export const nowEpochSeconds = (): number => Math.floor(Date.now() / 1000);
