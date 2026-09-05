// backend/test/billingCheckout.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, linkCustomerMock, stripe } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  linkCustomerMock: vi.fn(),
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  },
}));

vi.mock('../src/billing/store', () => ({ getUser: getUserMock, linkCustomer: linkCustomerMock }));
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));
vi.mock('../src/billing/config', async (orig) => ({
  ...(await orig<typeof import('../src/billing/config')>()),
  stripePriceProMonthly: () => 'price_pro',
  stripePriceLifetime: () => 'price_life',
  appBaseUrl: () => 'https://app.test',
}));

import { checkout } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.post('/billing/checkout', (req: any, _res, next) => { req.user = { uid: 'u1', email: 'a@b.com' }; next(); }, checkout as any);

beforeEach(() => {
  getUserMock.mockReset();
  linkCustomerMock.mockReset();
  stripe.customers.create.mockReset();
  stripe.checkout.sessions.create.mockReset();
});

describe('POST /billing/checkout', () => {
  it('400 on a bad plan', async () => {
    const res = await request(app).post('/billing/checkout').send({ plan: 'gold' });
    expect(res.status).toBe(400);
  });

  it('409 for legacy users', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'legacy' });
    const res = await request(app).post('/billing/checkout').send({ plan: 'pro' });
    expect(res.status).toBe(409);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('creates a subscription session for pro and links a new customer', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    stripe.customers.create.mockResolvedValueOnce({ id: 'cus_new' });
    stripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/s/1' });

    const res = await request(app).post('/billing/checkout').send({ plan: 'pro' });

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', metadata: { firebaseUID: 'u1' } })
    );
    expect(linkCustomerMock).toHaveBeenCalledWith('u1', 'cus_new');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_new',
        line_items: [{ price: 'price_pro', quantity: 1 }],
        client_reference_id: 'u1',
        metadata: { firebaseUID: 'u1', plan: 'pro' },
        success_url: 'https://app.test/settings?checkout=success',
        cancel_url: 'https://app.test/settings?checkout=cancelled',
      })
    );
    expect(res.body).toEqual({ url: 'https://stripe.test/s/1' });
  });

  it('creates a payment session for lifetime and reuses an existing customer', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', billing: { stripeCustomerId: 'cus_existing' } });
    stripe.checkout.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/s/2' });

    const res = await request(app).post('/billing/checkout').send({ plan: 'lifetime' });

    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment', customer: 'cus_existing', line_items: [{ price: 'price_life', quantity: 1 }] })
    );
    expect(res.body).toEqual({ url: 'https://stripe.test/s/2' });
  });
});
