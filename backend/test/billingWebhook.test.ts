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
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));
const emails = vi.hoisted(() => ({
  sendProUpgradeEmail: vi.fn().mockResolvedValue(undefined),
  sendLifetimePurchaseEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCanceledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendLifetimeRefundEmail: vi.fn().mockResolvedValue(undefined),
}));
const { getRecipientEmailMock } = vi.hoisted(() => ({ getRecipientEmailMock: vi.fn() }));

vi.mock('../src/billing/store', () => store);
vi.mock('../src/billing/stripe', () => ({ getStripe: () => stripe, STRIPE_API_VERSION: '2024-06-20' }));
vi.mock('../src/utils/billingEmails', () => emails);
vi.mock('../src/billing/notify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/billing/notify')>();
  return { ...actual, getRecipientEmail: getRecipientEmailMock };
});
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
  Object.values(emails).forEach((m) => {
    m.mockReset();
    m.mockResolvedValue(undefined);
  });
  getRecipientEmailMock.mockReset();
  getRecipientEmailMock.mockResolvedValue('user@example.com');
  stripe.subscriptions.retrieve.mockReset();
  stripe.subscriptions.update.mockReset();
  stripe.subscriptions.update.mockResolvedValue({});
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

  it('checkout.session.completed (payment) -> lifetime + refund window + invoice id', async () => {
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', invoice: 'in_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
    const patch = store.patchBilling.mock.calls[0][1];
    expect(patch.lifetimePaymentIntentId).toBe('pi_1');
    expect(patch.lifetimeInvoiceId).toBe('in_1');
    expect(typeof patch.lifetimePurchasedAt).toBe('string');
    expect(patch.lifetimeRefundEligibleUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('checkout.session.completed (payment) from a Pro user schedules the subscription to cancel at period end and keeps its id', async () => {
    store.getUser.mockResolvedValue({ tier: 'pro', billing: { stripeSubscriptionId: 'sub_old' } });
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_old', { cancel_at_period_end: true });
    expect(store.patchBilling).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: true });
    expect(store.patchBilling).not.toHaveBeenCalledWith('u1', expect.objectContaining({ stripeSubscriptionId: null }));
  });

  it('checkout.session.completed (payment) still grants lifetime if scheduling the cancellation fails', async () => {
    store.getUser.mockResolvedValue({ tier: 'pro', billing: { stripeSubscriptionId: 'sub_old' } });
    stripe.subscriptions.update.mockRejectedValueOnce(new Error('sub gone'));
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
  });

  it('customer.subscription.deleted -> free', async () => {
    await handleStripeEvent(evt('customer.subscription.deleted', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionStatus: 'canceled', stripeSubscriptionId: null,
    }));
  });

  it('customer.subscription.deleted does NOT downgrade a lifetime user', async () => {
    store.getUser.mockResolvedValue({ tier: 'lifetime', billing: { stripeSubscriptionId: 'sub_old' } });
    await handleStripeEvent(evt('customer.subscription.deleted', { metadata: { firebaseUID: 'u1' } }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionStatus: 'canceled', stripeSubscriptionId: null,
    }));
  });

  it('customer.subscription.updated canceled does NOT downgrade a lifetime user', async () => {
    store.getUser.mockResolvedValue({ tier: 'lifetime', billing: { stripeSubscriptionId: 'sub_old' } });
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'canceled',
    }));
    expect(store.setTier).not.toHaveBeenCalled();
    expect(store.patchBilling).toHaveBeenCalledWith('u1', { stripeSubscriptionId: null });
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

  it('customer.subscription.updated treats a scheduled cancel_at as "ending" and uses that date', async () => {
    // The Stripe customer portal expresses "cancel at period end" as a
    // `cancel_at` timestamp with `cancel_at_period_end` still false.
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' },
      status: 'active', cancel_at_period_end: false, cancel_at: 555,
      items: { data: [{ current_period_end: 999 }] },
    }));
    expect(store.patchBilling).toHaveBeenCalledWith('u1', {
      subscriptionStatus: 'active', currentPeriodEnd: 555, cancelAtPeriodEnd: true,
    });
    // still an active subscription, so the tier stays pro
    expect(store.setTier).toHaveBeenCalledWith('u1', 'pro');
  });

  it('customer.subscription.updated reads current_period_end from the item when absent on the subscription (2025-basil shape)', async () => {
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' },
      status: 'active', cancel_at_period_end: false,
      items: { data: [{ current_period_end: 444 }] },
    }));
    expect(store.patchBilling).toHaveBeenCalledWith('u1', {
      subscriptionStatus: 'active', currentPeriodEnd: 444, cancelAtPeriodEnd: false,
    });
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

  it('charge.refunded of the lifetime payment -> reverts to Pro when the subscription is still live', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    store.getUser.mockResolvedValue({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_life', stripeSubscriptionId: 'sub_x' },
    });
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_x', status: 'active', cancel_at_period_end: true,
      items: { data: [{ current_period_end: 999 }] },
    });
    await handleStripeEvent(evt('charge.refunded', {
      customer: 'cus_1', amount: 1000, amount_refunded: 1000, payment_intent: 'pi_life',
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'pro');
    expect(store.setTier).not.toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      subscriptionStatus: 'active', currentPeriodEnd: 999, cancelAtPeriodEnd: true, refundedAt: expect.any(String),
    }));
  });

  it('charge.refunded of the lifetime payment -> drops to Free when no subscription is live', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    store.getUser.mockResolvedValue({
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_life' },
    });
    await handleStripeEvent(evt('charge.refunded', {
      customer: 'cus_1', amount: 1000, amount_refunded: 1000, payment_intent: 'pi_life',
    }));
    expect(store.setTier).toHaveBeenCalledWith('u1', 'free');
    expect(store.patchBilling).toHaveBeenCalledWith('u1', expect.objectContaining({
      refundedAt: expect.any(String), stripeSubscriptionId: null,
    }));
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

describe('handleStripeEvent - billing notification emails', () => {
  it('checkout.session.completed (subscription) -> Pro upgrade email with price, interval and next billing date', async () => {
    stripe.subscriptions.retrieve.mockResolvedValueOnce({
      id: 'sub_1', status: 'active', cancel_at_period_end: false,
      items: { data: [{ current_period_end: 1773446400, price: { unit_amount: 500, recurring: { interval: 'month' } } }] },
    });
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'subscription', subscription: 'sub_1', metadata: { firebaseUID: 'u1' },
    }));
    expect(emails.sendProUpgradeEmail).toHaveBeenCalledWith('user@example.com', expect.objectContaining({
      amount: '$5.00', interval: 'month', nextBillingDate: 'March 14, 2026',
    }));
  });

  it('checkout.session.completed (payment) -> Lifetime purchase email with amount and refund-window date', async () => {
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', invoice: 'in_1', amount_total: 1000,
      metadata: { firebaseUID: 'u1' },
    }));
    expect(emails.sendLifetimePurchaseEmail).toHaveBeenCalledWith('user@example.com', expect.objectContaining({
      amount: '$10.00', refundEligibleUntil: expect.any(String),
    }));
  });

  it('customer.subscription.updated -> cancellation email only on the false->true transition', async () => {
    store.getUser.mockResolvedValue({ tier: 'pro', billing: { cancelAtPeriodEnd: false } });
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'active',
      cancel_at_period_end: true, current_period_end: 1773446400,
    }));
    expect(emails.sendSubscriptionCanceledEmail).toHaveBeenCalledWith('user@example.com', expect.objectContaining({
      accessUntil: 'March 14, 2026',
    }));
  });

  it('customer.subscription.updated -> no cancellation email when it was already scheduled to cancel', async () => {
    store.getUser.mockResolvedValue({ tier: 'pro', billing: { cancelAtPeriodEnd: true } });
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'active', cancel_at_period_end: true, current_period_end: 1773446400,
    }));
    expect(emails.sendSubscriptionCanceledEmail).not.toHaveBeenCalled();
  });

  it('customer.subscription.updated -> no cancellation email for a lifetime user (our own post-upgrade auto-cancel)', async () => {
    store.getUser.mockResolvedValue({ tier: 'lifetime', billing: { cancelAtPeriodEnd: false, stripeSubscriptionId: 'sub_x' } });
    await handleStripeEvent(evt('customer.subscription.updated', {
      metadata: { firebaseUID: 'u1' }, status: 'active', cancel_at_period_end: true, current_period_end: 1773446400,
    }));
    expect(emails.sendSubscriptionCanceledEmail).not.toHaveBeenCalled();
  });

  it('invoice.payment_failed -> payment failure email, once, not repeated on a retry that is already past_due', async () => {
    store.getUser.mockResolvedValueOnce({ tier: 'pro', billing: { subscriptionStatus: 'active', currentPeriodEnd: 1773446400 } });
    await handleStripeEvent(evt('invoice.payment_failed', { metadata: { firebaseUID: 'u1' } }, 'evt_a'));
    expect(emails.sendPaymentFailedEmail).toHaveBeenCalledWith('user@example.com', expect.objectContaining({
      accessUntil: 'March 14, 2026',
    }));

    emails.sendPaymentFailedEmail.mockClear();
    store.getUser.mockResolvedValueOnce({ tier: 'pro', billing: { subscriptionStatus: 'past_due', currentPeriodEnd: 1773446400 } });
    await handleStripeEvent(evt('invoice.payment_failed', { metadata: { firebaseUID: 'u1' } }, 'evt_b'));
    expect(emails.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });

  it('charge.refunded of the lifetime payment -> refund email naming the plan the account landed on', async () => {
    store.uidForCustomer.mockResolvedValue('u1');
    // revertLifetimeAccess drops to free (no live subscription); the email reads
    // the tier back afterwards, so let setTier drive what getUser returns.
    let tier = 'lifetime';
    store.setTier.mockImplementation(async (_uid: string, t: string) => { tier = t; });
    store.getUser.mockImplementation(async () => ({
      tier, billing: { lifetimePaymentIntentId: 'pi_life' },
    }));
    await handleStripeEvent(evt('charge.refunded', {
      customer: 'cus_1', amount: 1000, amount_refunded: 1000, payment_intent: 'pi_life',
    }));
    expect(emails.sendLifetimeRefundEmail).toHaveBeenCalledWith('user@example.com', expect.objectContaining({
      amount: '$10.00', newTier: 'free',
    }));
  });

  it('a failing notification email never rejects the event', async () => {
    emails.sendLifetimePurchaseEmail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      handleStripeEvent(evt('checkout.session.completed', {
        mode: 'payment', payment_intent: 'pi_1', amount_total: 1000, metadata: { firebaseUID: 'u1' },
      }))
    ).resolves.not.toThrow();
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
    expect(store.markEventProcessed).toHaveBeenCalled();
  });

  it('no email is sent when the account has no address on file', async () => {
    getRecipientEmailMock.mockResolvedValue(null);
    await handleStripeEvent(evt('checkout.session.completed', {
      mode: 'payment', payment_intent: 'pi_1', amount_total: 1000, metadata: { firebaseUID: 'u1' },
    }));
    expect(emails.sendLifetimePurchaseEmail).not.toHaveBeenCalled();
    expect(store.setTier).toHaveBeenCalledWith('u1', 'lifetime');
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
