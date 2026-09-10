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

// The current period end lives on the Subscription object in older Stripe API
// versions but was moved onto the subscription *items* in 2025-03-31.basil.
// Webhook event payloads are serialized at the account's default API version, so
// `sub.current_period_end` can be undefined even when a fresh SDK retrieve (which
// uses our pinned STRIPE_API_VERSION) still returns it. Check both, and return
// null only when neither is present.
function periodEndOf(sub: any): number | null {
  const fromSub = sub?.current_period_end;
  if (typeof fromSub === 'number') return fromSub;
  const fromItem = sub?.items?.data?.[0]?.current_period_end;
  if (typeof fromItem === 'number') return fromItem;
  return null;
}

// A subscription can be scheduled to end in two representations: the classic
// `cancel_at_period_end` boolean, or `cancel_at` set to a timestamp (which is
// what the Stripe customer portal's "cancel at end of period" now does). Treat
// either as "ending".
function isSubscriptionEnding(sub: any): boolean {
  return Boolean(sub?.cancel_at_period_end) || typeof sub?.cancel_at === 'number';
}

// When ending via `cancel_at`, that timestamp is the real end date; otherwise the
// period end is when access lapses.
function accessEndsAt(sub: any): number | null {
  if (typeof sub?.cancel_at === 'number') return sub.cancel_at;
  return periodEndOf(sub);
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
      currentPeriodEnd: accessEndsAt(sub),
      cancelAtPeriodEnd: isSubscriptionEnding(sub),
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
    const current = await getUser(uid);
    // Idempotent refund window: a Stripe retry of the same checkout must not
    // extend the deadline, so only set it when it is not already present.
    const lifetimeRefundEligibleUntil =
      current.billing?.lifetimeRefundEligibleUntil ??
      nowEpochSeconds() + LIFETIME_REFUND_WINDOW_DAYS * 24 * 60 * 60;
    await setTier(uid, 'lifetime');
    await patchBilling(uid, {
      lifetimePurchasedAt: nowIso(),
      lifetimePaymentIntentId: String(session.payment_intent),
      // Kept so a later refund can be issued as a credit note against this
      // invoice, which is what makes the refund visible in billing history.
      lifetimeInvoiceId: session.invoice ? String(session.invoice) : null,
      lifetimeRefundEligibleUntil,
    });
    // A user upgrading from Pro no longer needs the monthly subscription, but we
    // let the paid-for period run out rather than cancelling on the spot: set it
    // to cancel at period end and KEEP stripeSubscriptionId, so that if they
    // refund the lifetime purchase within the window we can put them back on Pro
    // for whatever time is left. Its eventual subscription.deleted event is a
    // no-op for tier while they're lifetime (see the guard in onSubscription*).
    const subId = current.billing?.stripeSubscriptionId;
    if (subId) {
      try {
        await getStripe().subscriptions.update(subId, { cancel_at_period_end: true });
        await patchBilling(uid, { cancelAtPeriodEnd: true });
      } catch (err) {
        console.warn(`[billing] failed to schedule cancellation of ${subId} after lifetime purchase for ${uid}:`, (err as any)?.message);
      }
    }
  }
}

/**
 * Undo lifetime access after a refund. If a Pro subscription is still running
 * (the user upgraded from Pro and the paid period hasn't lapsed), drop them back
 * to Pro for the remaining time; otherwise drop them to Free.
 */
export async function revertLifetimeAccess(uid: string): Promise<void> {
  const { billing } = await getUser(uid);
  const subId = billing?.stripeSubscriptionId;
  if (subId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subId);
      if (sub.status === 'active' || sub.status === 'trialing') {
        await patchBilling(uid, {
          subscriptionStatus: sub.status,
          currentPeriodEnd: accessEndsAt(sub),
          cancelAtPeriodEnd: isSubscriptionEnding(sub),
          refundedAt: nowIso(),
        });
        await setTier(uid, 'pro');
        return;
      }
    } catch (err) {
      console.warn(`[billing] revertLifetimeAccess: could not check subscription ${subId} for ${uid}:`, (err as any)?.message);
    }
  }
  await setTier(uid, 'free');
  await patchBilling(uid, {
    refundedAt: nowIso(),
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: null,
  });
}

async function onSubscriptionUpdated(sub: any, uid: string, currentTier?: string): Promise<void> {
  await patchBilling(uid, {
    subscriptionStatus: sub.status,
    currentPeriodEnd: accessEndsAt(sub),
    cancelAtPeriodEnd: isSubscriptionEnding(sub),
  });
  // A lifetime user's tier is not governed by any subscription - e.g. the Pro
  // subscription we cancel when they upgrade. Only keep the bookkeeping current.
  if (currentTier === 'lifetime') {
    if (sub.status === 'canceled' || sub.status === 'unpaid') {
      await patchBilling(uid, { stripeSubscriptionId: null });
    }
    return;
  }
  if (sub.status === 'active' || sub.status === 'trialing') {
    await setTier(uid, 'pro');
  } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
    await setTier(uid, 'free');
    await patchBilling(uid, { stripeSubscriptionId: null });
  }
}

async function onSubscriptionDeleted(sub: any, uid: string, currentTier?: string): Promise<void> {
  await patchBilling(uid, { subscriptionStatus: 'canceled', stripeSubscriptionId: null });
  // Lifetime access outlives the (now cancelled) Pro subscription.
  if (currentTier === 'lifetime') return;
  await setTier(uid, 'free');
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
  const { billing } = await getUser(uid);
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  // When it's the lifetime charge that was refunded, run the smart revert (back
  // to Pro if a subscription is still live, else Free). Matching on the payment
  // intent - not the current tier - keeps this correct even when the /billing
  // /refund route already reverted the tier before this event arrived.
  if (billing?.lifetimePaymentIntentId && piId === billing.lifetimePaymentIntentId) {
    await revertLifetimeAccess(uid);
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
        await onSubscriptionUpdated(object, uid, user.tier);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(object, uid, user.tier);
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
