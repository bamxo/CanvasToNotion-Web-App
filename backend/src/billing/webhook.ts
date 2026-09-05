// backend/src/billing/webhook.ts
import type Stripe from 'stripe';
import { getStripe } from './stripe';
import { LIFETIME_REFUND_WINDOW_DAYS, nowEpochSeconds, nowIso } from './config';
import {
  getUser,
  setTier,
  patchBilling,
  uidForCustomer,
  isEventProcessed,
  markEventProcessed,
} from './store';

function customerIdOf(object: any): string | undefined {
  const c = object?.customer;
  return typeof c === 'string' ? c : c?.id;
}

async function resolveUid(object: any): Promise<string | null> {
  // TRUST NOTE: metadata.firebaseUID and client_reference_id are trusted ONLY
  // because every Checkout Session in this integration is created server-side
  // (billingController.checkout) from an authenticated req.user.uid, and events
  // are Stripe-signature-verified. If Stripe Payment Links are ever enabled,
  // client_reference_id becomes attacker-settable via a URL param and MUST be
  // dropped from this resolution chain.
  const fromMeta = object?.metadata?.firebaseUID || object?.client_reference_id;
  if (fromMeta) return String(fromMeta);
  const customerId = customerIdOf(object);
  if (customerId) return uidForCustomer(customerId);
  return null;
}

async function onCheckoutCompleted(session: any, uid: string): Promise<void> {
  if (session.mode === 'subscription') {
    const sub = await getStripe().subscriptions.retrieve(String(session.subscription));
    await setTier(uid, 'pro');
    await patchBilling(uid, {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: (sub as any).current_period_end ?? null,
      cancelAtPeriodEnd: (sub as any).cancel_at_period_end ?? null,
    });
  } else if (session.mode === 'payment') {
    // Only a confirmed payment grants lifetime access. Card checkout is always
    // 'paid' synchronously; delayed payment methods can be 'unpaid'/'no_payment_required'.
    if (session.payment_status && session.payment_status !== 'paid') return;
    // Without a payment intent we cannot process a future refund - drop the event
    // rather than persist a bogus lifetimePaymentIntentId of "null".
    if (!session.payment_intent) {
      console.warn(`[billing] checkout.session.completed for ${uid}: payment mode with no payment_intent`);
      return;
    }
    // Idempotent refund window: a Stripe retry of the same checkout must not
    // extend the deadline, so only set it when it is not already present.
    const existing = (await getUser(uid)).billing?.lifetimeRefundEligibleUntil;
    const lifetimeRefundEligibleUntil =
      existing ?? nowEpochSeconds() + LIFETIME_REFUND_WINDOW_DAYS * 24 * 60 * 60;
    await setTier(uid, 'lifetime');
    await patchBilling(uid, {
      lifetimePurchasedAt: nowIso(),
      lifetimePaymentIntentId: String(session.payment_intent),
      lifetimeRefundEligibleUntil,
    });
  }
}

async function onSubscriptionUpdated(sub: any, uid: string): Promise<void> {
  await patchBilling(uid, {
    subscriptionStatus: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? null,
  });
  if (sub.status === 'active' || sub.status === 'trialing') {
    await setTier(uid, 'pro');
  } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
    await setTier(uid, 'free');
    await patchBilling(uid, { stripeSubscriptionId: null });
  }
}

async function onSubscriptionDeleted(sub: any, uid: string): Promise<void> {
  await setTier(uid, 'free');
  await patchBilling(uid, { subscriptionStatus: 'canceled', stripeSubscriptionId: null });
}

async function onInvoicePaymentFailed(invoice: any, uid: string): Promise<void> {
  await patchBilling(uid, { subscriptionStatus: 'past_due' });
}

async function onChargeRefunded(charge: any, uid: string): Promise<void> {
  // Partial refunds (e.g. a goodwill credit) must NOT revoke access. Only a full
  // refund downgrades the user.
  if (typeof charge.amount === 'number' && typeof charge.amount_refunded === 'number'
      && charge.amount_refunded < charge.amount) {
    return;
  }
  await setTier(uid, 'free');
  await patchBilling(uid, { refundedAt: nowIso() });
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (await isEventProcessed(event.id)) return;

  const object = (event.data as any).object;
  const uid = await resolveUid(object);
  if (!uid) {
    console.warn(`[billing] webhook ${event.type} ${event.id}: could not resolve uid`);
    // The event is dropped - acked with 200 so Stripe does not retry - because we
    // cannot attribute it to a user. It is intentionally NOT marked processed so
    // that a later manual replay (once the reverse index exists) can still apply it.
    return;
  }

  // Resolve the current tier once, centrally. Legacy users are grandfathered:
  // their events are "handled" (no writes) but still marked processed so Stripe
  // stops retrying.
  const user = await getUser(uid);
  if (user.tier !== 'legacy') {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(object, uid);
        break;
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(object, uid);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(object, uid);
        break;
      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(object, uid);
        break;
      case 'charge.refunded':
        await onChargeRefunded(object, uid);
        break;
      default:
        break; // unknown types are acked and marked processed
    }
  }

  await markEventProcessed(event.id, event.type);
}
