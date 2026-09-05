import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { entitlementsForTier } from './tierRules';
import { getUser, BillingRecord, linkCustomer, setTier, patchBilling } from './store';
import { getStripe } from './stripe';
import {
  appBaseUrl,
  stripePriceLifetime,
  stripePriceProMonthly,
  stripeWebhookSecret,
  nowEpochSeconds,
  nowIso,
} from './config';
import { handleStripeEvent } from './webhook';

const PLAN_KEYS: (keyof BillingRecord)[] = [
  'subscriptionStatus',
  'currentPeriodEnd',
  'cancelAtPeriodEnd',
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
  const { tier, billing, createdAt } = await getUser(uid);
  const entitlements = entitlementsForTier(tier);
  const plan = planView(billing);
  res.status(200).json({
    ...entitlements,
    ...(plan ? { plan } : {}),
    ...(createdAt ? { memberSince: createdAt } : {}),
  });
}

type Plan = 'pro' | 'lifetime';

async function ensureCustomer(
  uid: string,
  email: string,
  existingCustomerId: string | undefined
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;
  const customer = await getStripe().customers.create({
    email,
    metadata: { firebaseUID: uid },
  });
  await linkCustomer(uid, customer.id);
  return customer.id;
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

  try {
    const customerId = await ensureCustomer(uid, email, billing?.stripeCustomerId);
    const price = plan === 'pro' ? stripePriceProMonthly() : stripePriceLifetime();
    const session = await getStripe().checkout.sessions.create({
      mode: plan === 'pro' ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: uid,
      metadata: { firebaseUID: uid, plan },
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
      return_url: `${appBaseUrl()}/settings`,
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
    await getStripe().refunds.create({ payment_intent: billing.lifetimePaymentIntentId });
  } catch (err) {
    console.error('[billing] refund failed:', err);
    res.status(502).json({ error: 'Refund could not be processed' });
    return;
  }

  await setTier(uid, 'free');
  await patchBilling(uid, { refundedAt: nowIso() });
  res.status(200).json({ refunded: true });
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
