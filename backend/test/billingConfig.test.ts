import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  LIFETIME_REFUND_WINDOW_DAYS,
  stripeSecretKey,
  stripePriceLifetime,
  appBaseUrl,
} from '../src/billing/config';

const ENV_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_LIFETIME', 'APP_BASE_URL', 'NODE_ENV'];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('billing config', () => {
  it('exposes the refund window as 7 days', () => {
    expect(LIFETIME_REFUND_WINDOW_DAYS).toBe(7);
  });

  it('returns env-backed values when set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_LIFETIME = 'price_life';
    expect(stripeSecretKey()).toBe('sk_test_123');
    expect(stripePriceLifetime()).toBe('price_life');
  });

  it('throws a named error when a required var is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => stripeSecretKey()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('appBaseUrl strips trailing slashes and falls back by NODE_ENV', () => {
    process.env.APP_BASE_URL = 'https://example.test/';
    expect(appBaseUrl()).toBe('https://example.test');
    delete process.env.APP_BASE_URL;
    process.env.NODE_ENV = 'production';
    expect(appBaseUrl()).toBe('https://canvastonotion.io');
    process.env.NODE_ENV = 'test';
    expect(appBaseUrl()).toBe('http://localhost:5173');
  });
});
