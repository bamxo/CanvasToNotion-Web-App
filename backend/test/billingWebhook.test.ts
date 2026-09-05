// backend/test/billingWebhook.test.ts
import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = vi.hoisted(() => ({
  getUser: vi.fn(),
  setTier: vi.fn(),
  patchBilling: vi.fn(),
  uidForCustomer: vi.fn(),
  isEventProcessed: vi.fn(),
  markEventProcessed: vi.fn(),
}));
const { stripe } = vi.hoisted(() => ({
  stripe: {
    subscriptions: { retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock('../src/billing/store', () => store);
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));
// Wrap the real handleStripeEvent so the dispatch-logic suite exercises it for
// real, while the HTTP-handler suite can stub it for one call.
vi.mock('../src/billing/webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/billing/webhook')>();
  return { ...actual, handleStripeEvent: vi.fn(actual.handleStripeEvent) };
});

import { handleStripeEvent } from '../src/billing/webhook';
import { webhook } from '../src/billing/billingController';

beforeEach(() => {
  Object.values(store).forEach((m) => m.mockReset());
  stripe.subscriptions.retrieve.mockReset();
  store.isEventProcessed.mockResolvedValue(false);
  store.uidForCustomer.mockResolvedValue(null);
  store.getUser.mockResolvedValue({ tier: 'free' });
});

const evt = (type: string, object: any, id = 'evt_1'): any => ({ id, type, data: { object } });

describe('handleStripeEvent', () => {
  it('is a no-op for an already-processed event', async () => {
    store.isEventProcessed.mockResolvedValueOnce(true);
    await handleStripeEvent(evt('charge.refunded', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).not.toHaveBeenCalled();
  });

  it('never downgrades a legacy user', async () => {
    store.getUser.mockResolvedValueOnce({ tier: 'legacy' });
    await handleStripeEvent(evt('customer.subscription.deleted', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.markEventProcessed).toHaveBeenCalled();
  });

  it('checkout.session.completed (subscription) -> pro + billing', async () => {
    stripe.subscriptions.retrieve.mockResolvedValueOnce({
      id: 'sub_1', status: 'active', current_period_end: 111, cancel_at_period_end: false,
    });
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'subscription', subscription: 'sub_1', client_reference_id: 'u1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'pro');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active', currentPeriodEnd: 111, cancelAtPeriodEnd: false,
    }));
  });

  it('checkout.session.completed (payment) -> lifetime + refund window', async () => {
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
    const patch = store.patchBilling.mock.calls[0][1];
    expect(patch.lifetimePaymentIntentId).toBe('pi_1');
    expect(typeof patch.lifetimePurchasedAt).toBe('string');
    expect(patch.lifetimeRefundEligibleUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('customer.subscription.deleted -> free', async () => {
    await handleStripeEvent(evt('customer.subscription.deleted', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionStatus: 'canceled', stripeSubscriptionId: null,
    }));
  });

  it('invoice.payment_failed -> past_due, tier untouched', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    await handleStripeEvent(evt('invoice.payment_failed', { customer: 'cus_1' }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).toHaveBeenCalledWith('u1', { subscriptionStatus: 'past_due' });
  });

  it('charge.refunded -> free + refundedAt, resolved via customer reverse index', async () => {
    // resolveUid runs once in handleStripeEvent (uid guard) and again inside the
    // per-type handler, so the reverse-index mock must answer every call.
    store.uidForCustomer.mockResolvedValue('u1');
    await handleStripeEvent(evt('charge.refunded', { customer: 'cus_1' }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({ refundedAt: expect.any(String) }));
  });

  it('unresolved uid -> no writes but still acked (no markEventProcessed)', async () => {
    await handleStripeEvent(evt('charge.refunded', { customer: 'cus_unknown' }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.markEventProcessed).not.toHaveBeenCalled();
  });

  it('customer.subscription.updated active -> pro + billing patch', async () => {
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' },
      status: 'active', current_period_end: 222, cancel_at_period_end: false,
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'pro');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', {
      subscriptionStatus: 'active', currentPeriodEnd: 222, cancelAtPeriodEnd: false,
    });
    expect(store.markEventProcessed).toHaveBeenCalled();
  });

  it('customer.subscription.updated canceled -> free + clears subscription id', async () => {
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'canceled',
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', { stripeSubscriptionId: null });
  });

  it('customer.subscription.updated past_due -> billing patch only, tier untouched', async () => {
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'past_due',
      current_period_end: 333, cancel_at_period_end: true,
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).toHaveBeenCalledWith('u1', {
      subscriptionStatus: 'past_due', currentPeriodEnd: 333, cancelAtPeriodEnd: true,
    });
  });

  it('unknown event type with a resolvable uid -> no writes but IS marked processed', async () => {
    await handleStripeEvent(evt('payment_intent.created', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).not.toHaveBeenCalled();
    expect(store.markEventProcessed).toHaveBeenCalledWith('evt_1', 'payment_intent.created');
  });

  it('checkout.session.completed for a legacy user -> no writes but IS marked processed', async () => {
    store.getUser.mockResolvedValueOnce({ tier: 'legacy' });
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).not.toHaveBeenCalled();
    expect(store.markEventProcessed).toHaveBeenCalled();
  });

  it('charge.refunded partial refund -> access NOT revoked', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    await handleStripeEvent(evt('charge.refunded', {
      customer: 'cus_1', amount: 1000, amount_refunded: 200,
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).not.toHaveBeenCalled();
  });

  it('charge.refunded full refund -> downgrades to free', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    await handleStripeEvent(evt('charge.refunded', {
      customer: 'cus_1', amount: 1000, amount_refunded: 1000,
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
  });

  it('checkout.session.completed (payment) unpaid -> no writes', async () => {
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_status: 'unpaid', payment_intent: 'pi_1',
      metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).not.toHaveBeenCalled();
  });

  it('checkout.session.completed (payment) with no payment_intent -> no writes', async () => {
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).not.toHaveBeenCalled();
  });
});

describe('POST /billing/webhook handler', () => {
  const makeApp = () => {
    const app = express();
    app.use('/billing/webhook', express.raw({ type: 'application/json' }));
    app.post('/billing/webhook', webhook as any);
    return app;
  };

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    stripe.webhooks.constructEvent.mockReset();
    vi.mocked(handleStripeEvent).mockClear();
  });

  it('returns 400 when the signature is invalid (constructEvent throws)', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const res = await request(makeApp())
      .post('/billing/webhook')
      .set('stripe-signature', 'bad')
      .set('content-type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it('returns 200 { received: true } and dispatches the event on a valid signature', async () => {
    const event = { id: 'evt_http', type: 'charge.refunded', data: { object: {} } };
    stripe.webhooks.constructEvent.mockReturnValue(event as any);
    vi.mocked(handleStripeEvent).mockResolvedValueOnce(undefined);

    const res = await request(makeApp())
      .post('/billing/webhook')
      .set('stripe-signature', 'good')
      .set('content-type', 'application/json')
      .send('{}');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(handleStripeEvent).toHaveBeenCalledWith(event);
  });
});
