// backend/test/billingRefund.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, setTierMock, patchBillingMock, stripe } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  setTierMock: vi.fn(),
  patchBillingMock: vi.fn(),
  stripe: {
    refunds: { create: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
    invoices: { retrieve: vi.fn() },
    creditNotes: { create: vi.fn() },
  },
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
  stripe.subscriptions.retrieve.mockReset();
  stripe.invoices.retrieve.mockReset();
  stripe.creditNotes.create.mockReset();
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

  it('issues a credit note against the invoice and drops to free when no subscription is live', async () => {
    getUserMock.mockResolvedValue({
      tier: 'lifetime',
      billing: {
        lifetimePaymentIntentId: 'pi_1',
        lifetimeInvoiceId: 'in_1',
        lifetimeRefundEligibleUntil: FUTURE,
      },
    });
    stripe.invoices.retrieve.mockResolvedValueOnce({ id: 'in_1', amount_paid: 1000, total: 1000 });
    stripe.creditNotes.create.mockResolvedValueOnce({ id: 'cn_1' });

    const res = await request(app).post('/billing/refund').send({});

    expect(stripe.creditNotes.create).toHaveBeenCalledWith({
      invoice: 'in_1', amount: 1000, refund_amount: 1000, reason: 'order_change',
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(setTierMock).toHaveBeenCalledWith('u1', 'free');
    expect(patchBillingMock).toHaveBeenCalledWith('u1', expect.objectContaining({
      refundedAt: expect.any(String), stripeSubscriptionId: null,
    }));
    expect(res.body).toEqual({ refunded: true });
  });

  it('falls back to a plain refund for legacy purchases with no stored invoice', async () => {
    getUserMock.mockResolvedValue({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_1', lifetimeRefundEligibleUntil: FUTURE },
    });
    stripe.refunds.create.mockResolvedValueOnce({ id: 're_1' });

    const res = await request(app).post('/billing/refund').send({});

    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
    expect(stripe.creditNotes.create).not.toHaveBeenCalled();
    expect(setTierMock).toHaveBeenCalledWith('u1', 'free');
    expect(res.body).toEqual({ refunded: true });
  });

  it('refunds within the window and reverts to Pro when the upgraded-from subscription is still active', async () => {
    getUserMock.mockResolvedValue({
      tier: 'lifetime',
      billing: {
        lifetimePaymentIntentId: 'pi_1',
        lifetimeRefundEligibleUntil: FUTURE,
        stripeSubscriptionId: 'sub_x',
      },
    });
    stripe.refunds.create.mockResolvedValueOnce({ id: 're_1' });
    stripe.subscriptions.retrieve.mockResolvedValueOnce({
      id: 'sub_x', status: 'active', cancel_at_period_end: true,
      items: { data: [{ current_period_end: 1234 }] },
    });

    const res = await request(app).post('/billing/refund').send({});

    expect(setTierMock).toHaveBeenCalledWith('u1', 'pro');
    expect(setTierMock).not.toHaveBeenCalledWith('u1', 'free');
    expect(patchBillingMock).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionStatus: 'active', currentPeriodEnd: 1234, cancelAtPeriodEnd: true,
    }));
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
