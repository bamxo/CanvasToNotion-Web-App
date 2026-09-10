import { getDatabase } from '../config/firebaseAdmin';
import { UserTier } from '../types';
import { nowIso } from './config';

export type BillingRecord = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
  lifetimePurchasedAt?: string | null;
  lifetimePaymentIntentId?: string | null;
  lifetimeRefundEligibleUntil?: number | null;
  refundedAt?: string | null;
  updatedAt?: string;
};

const db = () => getDatabase();

export async function getUser(
  uid: string
): Promise<{
  tier?: UserTier;
  billing?: BillingRecord;
  createdAt?: string;
  workspaceId?: string;
  accessToken?: string;
}> {
  const userSnap = await db().ref(`users/${uid}`).once('value');
  const user = userSnap.val() ?? {};
  return {
    tier: user.tier,
    billing: user.billing ?? undefined,
    createdAt: user.createdAt ?? undefined,
    workspaceId: user.workspaceId ?? undefined,
    accessToken: user.accessToken ?? undefined,
  };
}

export async function setTier(uid: string, tier: UserTier): Promise<void> {
  await db().ref(`users/${uid}`).update({ tier });
}

export async function patchBilling(
  uid: string,
  patch: Partial<BillingRecord>
): Promise<void> {
  await db().ref(`users/${uid}/billing`).update({ ...patch, updatedAt: nowIso() });
}

export async function linkCustomer(uid: string, customerId: string): Promise<void> {
  await db().ref(`users/${uid}/billing`).update({ stripeCustomerId: customerId });
  await db().ref(`stripeCustomers/${customerId}`).set(uid);
}

export async function uidForCustomer(customerId: string): Promise<string | null> {
  const snap = await db().ref(`stripeCustomers/${customerId}`).once('value');
  return (snap.val() as string | null) ?? null;
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const snap = await db().ref(`stripeEvents/${eventId}`).once('value');
  return snap.val() != null;
}

export async function markEventProcessed(eventId: string, type: string): Promise<void> {
  await db().ref(`stripeEvents/${eventId}`).set({ type, receivedAt: nowIso() });
}
