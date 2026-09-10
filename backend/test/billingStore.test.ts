import { describe, expect, it, vi, beforeEach } from 'vitest';

const { refMock, db } = vi.hoisted(() => {
  const nodes = new Map<string, any>();
  const refMock = vi.fn((path: string) => ({
    async once(_evt: string) {
      return { val: () => nodes.get(path) ?? null };
    },
    async update(patch: Record<string, unknown>) {
      nodes.set(path, { ...(nodes.get(path) ?? {}), ...patch });
    },
    async set(value: unknown) {
      nodes.set(path, value);
    },
  }));
  return { refMock, db: { ref: refMock, __nodes: nodes } };
});

vi.mock('../src/config/firebaseAdmin', () => ({
  admin: { database: () => db },
  getDatabase: () => db,
}));

import {
  getUser,
  setTier,
  patchBilling,
  linkCustomer,
  uidForCustomer,
  isEventProcessed,
  markEventProcessed,
} from '../src/billing/store';

beforeEach(() => {
  (db as any).__nodes.clear();
  refMock.mockClear();
});

describe('billing store', () => {
  it('setTier writes users/{uid}/tier', async () => {
    await setTier('u1', 'pro');
    expect(refMock).toHaveBeenCalledWith('users/u1');
    expect((db as any).__nodes.get('users/u1')).toEqual({ tier: 'pro' });
  });

  it('patchBilling merges and stamps updatedAt', async () => {
    await patchBilling('u1', { subscriptionStatus: 'active' });
    const node = (db as any).__nodes.get('users/u1/billing');
    expect(node.subscriptionStatus).toBe('active');
    expect(typeof node.updatedAt).toBe('string');
  });

  it('linkCustomer writes both the customer id and the reverse index', async () => {
    await linkCustomer('u1', 'cus_1');
    expect((db as any).__nodes.get('users/u1/billing')).toMatchObject({ stripeCustomerId: 'cus_1' });
    expect((db as any).__nodes.get('stripeCustomers/cus_1')).toBe('u1');
  });

  it('uidForCustomer reads the reverse index', async () => {
    await linkCustomer('u9', 'cus_9');
    expect(await uidForCustomer('cus_9')).toBe('u9');
    expect(await uidForCustomer('cus_missing')).toBeNull();
  });

  it('getUser returns tier and billing from a single users/{uid} read', async () => {
    // getUser now does ONE read of users/{uid} and pulls billing from the nested
    // `billing` child, so model the RTDB shape directly.
    (db as any).__nodes.set('users/u2', {
      tier: 'lifetime',
      billing: { lifetimePaymentIntentId: 'pi_1' },
    });
    const user = await getUser('u2');
    expect(user.tier).toBe('lifetime');
    expect(user.billing?.lifetimePaymentIntentId).toBe('pi_1');
    // exactly one ref() call against the user node, no second billing read
    expect(refMock).toHaveBeenCalledWith('users/u2');
    expect(refMock).not.toHaveBeenCalledWith('users/u2/billing');
  });

  it('getUser returns workspaceId from the user node when present', async () => {
    (db as any).__nodes.set('users/u3', { tier: 'free', workspaceId: 'ws-abc' });
    const user = await getUser('u3');
    expect(user.workspaceId).toBe('ws-abc');
  });

  it('getUser leaves workspaceId undefined when the user node has none', async () => {
    (db as any).__nodes.set('users/u4', { tier: 'free' });
    const user = await getUser('u4');
    expect(user.workspaceId).toBeUndefined();
  });

  it('getUser returns accessToken from the user node when present', async () => {
    (db as any).__nodes.set('users/u5', { tier: 'free', accessToken: 'notion_tok' });
    const user = await getUser('u5');
    expect(user.accessToken).toBe('notion_tok');
  });

  it('event processing guard is write-once', async () => {
    expect(await isEventProcessed('evt_1')).toBe(false);
    await markEventProcessed('evt_1', 'charge.refunded');
    expect(await isEventProcessed('evt_1')).toBe(true);
  });
});
