// backend/test/billingPortal.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, stripe } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  stripe: { billingPortal: { sessions: { create: vi.fn() } } },
}));
vi.mock('../src/billing/store', () => ({ getUser: getUserMock }));
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));
vi.mock('../src/billing/config', async (orig) => ({
  ...(await orig<typeof import('../src/billing/config')>()),
  appBaseUrl: () => 'https://app.test',
}));

import { portal } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.post('/billing/portal', (req: any, _res, next) => { req.user = { uid: 'u1', email: 'a@b.com' }; next(); }, portal as any);

beforeEach(() => { getUserMock.mockReset(); stripe.billingPortal.sessions.create.mockReset(); });

describe('POST /billing/portal', () => {
  it('404 when the user has no Stripe customer', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    const res = await request(app).post('/billing/portal').send({});
    expect(res.status).toBe(404);
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('returns a portal url for a customer', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: { stripeCustomerId: 'cus_1' } });
    stripe.billingPortal.sessions.create.mockResolvedValueOnce({ url: 'https://stripe.test/p/1' });
    const res = await request(app).post('/billing/portal').send({});
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://app.test/settings?billing=updated',
    });
    expect(res.body).toEqual({ url: 'https://stripe.test/p/1' });
  });
});
