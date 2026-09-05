// backend/test/billingRefund.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, setTierMock, patchBillingMock, stripe } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  setTierMock: vi.fn(),
  patchBillingMock: vi.fn(),
  stripe: { refunds: { create: vi.fn() } },
}));
vi.mock('../src/billing/store', () => ({
  getUser: getUserMock, setTier: setTierMock, patchBilling: patchBillingMock,
}));
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));

import { refund } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.post('/billing/refund', (req: any, _res, next) => { req.user = { uid: 'u1', email: 'a@b.com' }; next(); }, refund as any);

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

beforeEach(() => {
  getUserMock.mockReset(); setTierMock.mockReset(); patchBillingMock.mockReset();
  stripe.refunds.create.mockReset();
});

describe('POST /billing/refund', () => {
  it('409 when the user is not lifetime', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: {} });
    const res = await request(app).post('/billing/refund').send({});
    expect(res.status).toBe(409);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('409 when there is no stored payment intent', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'lifetime', billing: { lifetimeRefundEligibleUntil: FUTURE } });
    const res = await request(app).post('/billing/refund').send({});
    expect(res.status).toBe(409);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('403 after the refund window closes', async () => {
    getUserMock.mockResolvedValueOnce({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_1', lifetimeRefundEligibleUntil: PAST },
    });
    const res = await request(app).post('/billing/refund').send({});
    expect(res.status).toBe(403);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('refunds within the window and downgrades to free', async () => {
    getUserMock.mockResolvedValueOnce({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_1', lifetimeRefundEligibleUntil: FUTURE },
    });
    stripe.refunds.create.mockResolvedValueOnce({ id: 're_1' });

    const res = await request(app).post('/billing/refund').send({});

    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(setTierMock).toHaveBeenCalledWith('u1', 'free');
    expect(patchBillingMock).toHaveBeenCalledWith('u1', expect.objectContaining({ refundedAt: expect.any(String) }));
    expect(res.body).toEqual({ refunded: true });
  });

  it('502 when Stripe refund fails, and does NOT downgrade or patch billing first', async () => {
    getUserMock.mockResolvedValueOnce({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_1', lifetimeRefundEligibleUntil: FUTURE },
    });
    stripe.refunds.create.mockRejectedValueOnce(new Error('stripe down'));

    const res = await request(app).post('/billing/refund').send({});

    expect(res.status).toBe(502);
    expect(setTierMock).not.toHaveBeenCalled();
    expect(patchBillingMock).not.toHaveBeenCalled();
  });
});
