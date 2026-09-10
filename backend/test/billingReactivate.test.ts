// backend/test/billingReactivate.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, patchBillingMock, stripe } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  patchBillingMock: vi.fn(),
  stripe: { subscriptions: { retrieve: vi.fn(), update: vi.fn() } },
}));
vi.mock('../src/billing/store', () => ({
  getUser: getUserMock, patchBilling: patchBillingMock,
}));
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));

import { reactivate } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.post('/billing/reactivate', (req: any, _res, next) => { req.user = { uid: 'u1' }; next(); }, reactivate as any);

beforeEach(() => {
  getUserMock.mockReset();
  patchBillingMock.mockReset();
  stripe.subscriptions.retrieve.mockReset();
  stripe.subscriptions.update.mockReset();
});

describe('POST /billing/reactivate', () => {
  it('409 when the user is not on Pro', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', billing: {} });
    const res = await request(app).post('/billing/reactivate').send({});
    expect(res.status).toBe(409);
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });

  it('409 when there is no subscription id', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: {} });
    const res = await request(app).post('/billing/reactivate').send({});
    expect(res.status).toBe(409);
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });

  it('clears a scheduled cancel_at (Stripe portal cancellation) and persists the change', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: { stripeSubscriptionId: 'sub_1' } });
    stripe.subscriptions.retrieve.mockResolvedValueOnce({ id: 'sub_1', cancel_at_period_end: false, cancel_at: 555 });
    stripe.subscriptions.update.mockResolvedValueOnce({ id: 'sub_1', status: 'active' });

    const res = await request(app).post('/billing/reactivate').send({});

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { cancel_at: '' });
    expect(patchBillingMock).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: false, subscriptionStatus: 'active' });
    expect(res.body).toEqual({ reactivated: true });
  });

  it('clears cancel_at_period_end when that is how the cancellation was set', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: { stripeSubscriptionId: 'sub_1' } });
    stripe.subscriptions.retrieve.mockResolvedValueOnce({ id: 'sub_1', cancel_at_period_end: true, cancel_at: null });
    stripe.subscriptions.update.mockResolvedValueOnce({ id: 'sub_1', status: 'active' });

    await request(app).post('/billing/reactivate').send({});

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: false });
  });

  it('502 when Stripe rejects and does not patch billing', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', billing: { stripeSubscriptionId: 'sub_1' } });
    stripe.subscriptions.retrieve.mockResolvedValueOnce({ id: 'sub_1', cancel_at: 555 });
    stripe.subscriptions.update.mockRejectedValueOnce(new Error('stripe down'));

    const res = await request(app).post('/billing/reactivate').send({});

    expect(res.status).toBe(502);
    expect(patchBillingMock).not.toHaveBeenCalled();
  });
});
