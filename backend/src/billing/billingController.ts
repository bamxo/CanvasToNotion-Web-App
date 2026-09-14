import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { entitlementsForTier } from './tierRules';
import { getUser, BillingRecord, linkCustomer, patchBilling } from './store';
import { getStripe } from './stripe';
import {
  appBaseUrl,
  stripePriceLifetime,
  stripePriceProMonthly,
  stripeWebhookSecret,
  nowEpochSeconds,
} from './config';
import { handleStripeEvent, revertLifetimeAccess } from './webhook';
import { getSyncedCourseIds, getWorkspaceSyncedCourseIds } from '../notion_api/classSyncStore';

const PLAN_KEYS: (keyof BillingRecord)[] = [
  'subscriptionStatus',
  'currentPeriodEnd',
  'cancelAtPeriodEnd',
  'lifetimePurchasedAt',
  'lifetimeRefundEligibleUntil',
  'refundedAt',
];

function planView(billing: BillingRecord | undefined): Record<string, unknown> | undefined {
  if (!billing) return undefined;
  const view: Record<string, unknown> = {};
  for (const key of PLAN_KEYS) {
    if (billing[key] !== undefined) view[key] = billing[key];
  }
  return Object.keys(view).length ? view : undefined;
}

export async function getEntitlements(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  const { tier, billing, createdAt, workspaceId, accessToken } = await getUser(uid);
  const entitlements = entitlementsForTier(tier);
  const plan = planView(billing);
  // Usage is keyed on the Notion workspace so a reconnect restores the same
  // ledger; `notionConnected` reflects the *live* connection (a live access
  // token), matching how the rest of the app reports Notion status — a
  // disconnect clears the token but leaves workspaceId behind.
  const syncedCourseIds = workspaceId
    ? await getWorkspaceSyncedCourseIds(workspaceId)
    : await getSyncedCourseIds(uid);
  res.status(200).json({
    ...entitlements,
    classSyncUsed: syncedCourseIds.length,
    syncedCourseIds,
    notionConnected: Boolean(accessToken),
    ...(plan ? { plan } : {}),
    ...(createdAt ? { memberSince: createdAt } : {}),
  });
}

type Plan = 'pro' | 'lifetime';

async function createAndLinkCustomer(uid: string, email: string): Promise<string> {
  const customer = await getStripe().customers.create({
    email,
    metadata: { firebaseUID: uid },
  });
  await linkCustomer(uid, customer.id);
  return customer.id;
}

async function ensureCustomer(
  uid: string,
  email: string,
  existingCustomerId: string | undefined
): Promise<string> {
  if (!existingCustomerId) return createAndLinkCustomer(uid, email);
  // The stored customer can vanish from Stripe's side - deleted by hand, or
  // living in a different account/mode than the current keys. Rather than 502
  // forever, verify it and re-provision if it's gone.
  try {
    const customer = await getStripe().customers.retrieve(existingCustomerId);
    if (!(customer as { deleted?: boolean }).deleted) return existingCustomerId;
  } catch (err) {
    if ((err as { code?: string }).code !== 'resource_missing') throw err;
  }
  console.warn(`[billing] stored customer ${existingCustomerId} for ${uid} is missing - creating a new one`);
  return createAndLinkCustomer(uid, email);
}

export async function checkout(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const uid = req.user?.uid;
  const email = req.user?.email ?? '';
  if (!uid) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const plan = (req.body?.plan ?? '') as Plan;
  if (plan !== 'pro' && plan !== 'lifetime') {
    res.status(400).json({ error: 'plan must be "pro" or "lifetime"' });
    return;
  }

  const { tier, billing } = await getUser(uid);
  if (tier === 'legacy') {
    res.status(409).json({ error: 'Legacy accounts already have full access' });
    return;
  }
  // Lifetime is terminal - a lifetime holder buying again would be charged a
  // second $10 with nothing to grant. Pro -> lifetime is still allowed (the
  // webhook cancels the subscription on completion).
  if (tier === 'lifetime') {
    res.status(409).json({ error: 'You already have Lifetime access' });
    return;
  }
  // Block a second Pro subscription. `tier` is the source of truth - it and
  // stripeSubscriptionId are written together by the webhook, so a stale id on
  // an otherwise-free account (leftover from a cancelled sub) must NOT block a
  // new checkout.
  if (plan === 'pro' && tier === 'pro') {
    res.status(409).json({ error: 'You already have an active Pro subscription' });
    return;
  }

  try {
    const customerId = await ensureCustomer(uid, email, billing?.stripeCustomerId);
    const price = plan === 'pro' ? stripePriceProMonthly() : stripePriceLifetime();
    const session = await getStripe().checkout.sessions.create({
      mode: plan === 'pro' ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: uid,
      metadata: { firebaseUID: uid, plan },
      // One-time payments don't produce an invoice unless asked; without this the
      // lifetime charge never shows in the customer's billing history / portal.
      ...(plan === 'lifetime' ? { invoice_creation: { enabled: true } } : {}),
      success_url: `${appBaseUrl()}/settings?checkout=success`,
      cancel_url: `${appBaseUrl()}/settings?checkout=cancelled`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing] checkout failed:', err);
    res.status(502).json({ error: 'Could not start checkout' });
  }
}

export async function portal(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  const { billing } = await getUser(uid);
  if (!billing?.stripeCustomerId) {
    res.status(404).json({ error: 'No billing account' });
    return;
  }
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${appBaseUrl()}/settings?billing=updated`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing] portal failed:', err);
    res.status(502).json({ error: 'Could not open the billing portal' });
  }
}

export async function refund(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  const { tier, billing } = await getUser(uid);

  if (tier !== 'lifetime' || !billing?.lifetimePaymentIntentId) {
    res.status(409).json({ error: 'No refundable purchase' });
    return;
  }
  const eligibleUntil = billing.lifetimeRefundEligibleUntil ?? 0;
  if (nowEpochSeconds() > eligibleUntil) {
    res.status(403).json({ error: 'Your 7-day refund window has closed' });
    return;
  }

  try {
    if (billing.lifetimeInvoiceId) {
      // A credit note issues the refund AND records it against the invoice, so
      // it shows up in the customer's billing history. Assumes a tax-free
      // invoice (crediting the full total); tax would require line-based credit
      // notes.
      const invoice = await getStripe().invoices.retrieve(billing.lifetimeInvoiceId);
      // amount_paid can briefly read 0 right after payment; fall back to total.
      const amount = invoice.amount_paid || invoice.total;
      await getStripe().creditNotes.create({
        invoice: billing.lifetimeInvoiceId,
        amount,
        refund_amount: amount,
        reason: 'order_change',
      });
    } else {
      // Legacy purchases made before invoice creation was enabled.
      await getStripe().refunds.create({ payment_intent: billing.lifetimePaymentIntentId });
    }
  } catch (err) {
    console.error('[billing] refund failed:', err);
    res.status(502).json({ error: 'Refund could not be processed' });
    return;
  }

  // Back to Pro if the (upgraded-from) subscription is still live, else Free.
  await revertLifetimeAccess(uid);
  res.status(200).json({ refunded: true });
}

/**
 * Clear a pending cancellation on the user's Pro subscription (the "cancel at
 * period end" flag), so it renews instead of lapsing.
 */
export async function reactivate(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  const { tier, billing } = await getUser(uid);
  if (tier !== 'pro' || !billing?.stripeSubscriptionId) {
    res.status(409).json({ error: 'No subscription to reactivate' });
    return;
  }

  try {
    // A pending cancellation is stored as either `cancel_at_period_end: true` or
    // a `cancel_at` timestamp (what the Stripe portal sets). Stripe rejects an
    // update that passes both, so clear whichever one is actually set.
    const current = await getStripe().subscriptions.retrieve(billing.stripeSubscriptionId);
    const clear = current.cancel_at_period_end
      ? { cancel_at_period_end: false }
      : { cancel_at: '' as const };
    const sub = await getStripe().subscriptions.update(billing.stripeSubscriptionId, clear);
    await patchBilling(uid, {
      cancelAtPeriodEnd: false,
      subscriptionStatus: sub.status,
    });
  } catch (err) {
    console.error('[billing] reactivate failed:', err);
    res.status(502).json({ error: 'Could not reactivate the subscription' });
    return;
  }

  res.status(200).json({ reactivated: true });
}

export async function webhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature as string,
      stripeWebhookSecret()
    );
  } catch (err) {
    console.error('[billing] webhook signature verification failed:', err,
      { isBuffer: Buffer.isBuffer(req.body), bodyLength: (req.body as Buffer | undefined)?.length });
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error(`[billing] webhook handler error for ${event.type}:`, err);
    res.status(500).json({ error: 'Webhook handler failed' });
    return;
  }
  res.status(200).json({ received: true });
}
