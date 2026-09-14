import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, getSyncedCourseIdsMock, getWorkspaceSyncedCourseIdsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getSyncedCourseIdsMock: vi.fn(),
  getWorkspaceSyncedCourseIdsMock: vi.fn(),
}));
vi.mock('../src/billing/store', () => ({ getUser: getUserMock }));
vi.mock('../src/notion_api/classSyncStore', () => ({
  getSyncedCourseIds: getSyncedCourseIdsMock,
  getWorkspaceSyncedCourseIds: getWorkspaceSyncedCourseIdsMock,
}));

import { getEntitlements } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.get('/users/entitlements', (req: any, _res, next) => { req.user = { uid: 'u1', email: 'a@b.com' }; next(); }, getEntitlements as any);

beforeEach(() => {
  getUserMock.mockReset();
  getSyncedCourseIdsMock.mockReset();
  getSyncedCourseIdsMock.mockResolvedValue([]);
  getWorkspaceSyncedCourseIdsMock.mockReset();
  getWorkspaceSyncedCourseIdsMock.mockResolvedValue([]);
});

describe('GET /users/entitlements', () => {
  it('returns free entitlements when the user has no tier', async () => {
    getUserMock.mockResolvedValueOnce({});
    const res = await request(app).get('/users/entitlements');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      tier: 'free', showAds: true, hasProFeatures: false,
      classSyncLimit: 5, classSyncUsed: 0, syncedCourseIds: [],
      notionConnected: false,
    });
  });

  it('returns pro entitlements with a plan sub-object and unlimited class sync', async () => {
    getUserMock.mockResolvedValueOnce({
      tier: 'pro',
      billing: { stripeCustomerId: 'cus_1', subscriptionStatus: 'active', currentPeriodEnd: 123, cancelAtPeriodEnd: false },
    });
    const res = await request(app).get('/users/entitlements');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      tier: 'pro',
      showAds: false,
      hasProFeatures: true,
      classSyncLimit: null,
      classSyncUsed: 0,
      syncedCourseIds: [],
      notionConnected: false,
      plan: { subscriptionStatus: 'active', currentPeriodEnd: 123, cancelAtPeriodEnd: false },
    });
    expect(JSON.stringify(res.body)).not.toContain('cus_1');
  });

  it('includes lifetimeRefundEligibleUntil and lifetimePurchasedAt for a lifetime user', async () => {
    getUserMock.mockResolvedValueOnce({
      tier: 'lifetime',
      billing: { lifetimeRefundEligibleUntil: 999, lifetimePurchasedAt: '2026-02-01T00:00:00.000Z' },
    });
    const res = await request(app).get('/users/entitlements');
    expect(res.body.plan).toEqual({
      lifetimeRefundEligibleUntil: 999,
      lifetimePurchasedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('includes memberSince when the user has a createdAt', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'legacy', createdAt: '2024-01-15T00:00:00.000Z' });
    const res = await request(app).get('/users/entitlements');
    expect(res.body.memberSince).toBe('2024-01-15T00:00:00.000Z');
  });

  it('omits memberSince when the user has no createdAt', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    const res = await request(app).get('/users/entitlements');
    expect(res.body).not.toHaveProperty('memberSince');
  });

  it('reports classSyncUsed as the count of synced course ids', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    getSyncedCourseIdsMock.mockResolvedValueOnce(['101', '102', '103']);
    const res = await request(app).get('/users/entitlements');
    expect(res.body.classSyncUsed).toBe(3);
    expect(res.body.syncedCourseIds).toEqual(['101', '102', '103']);
    expect(res.body.classSyncLimit).toBe(5);
  });

  it('resolves classSyncUsed from the workspace ledger and reports notionConnected true when a live token is present', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws-1', accessToken: 'notion_tok' });
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce(['a', 'b', 'c']);
    const res = await request(app).get('/users/entitlements');
    expect(res.body.classSyncUsed).toBe(3);
    expect(res.body.syncedCourseIds).toEqual(['a', 'b', 'c']);
    expect(res.body.notionConnected).toBe(true);
    expect(getSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('reports notionConnected false after a disconnect even though workspaceId lingers, still resolving usage from the workspace ledger', async () => {
    // /notion/disconnect removes accessToken but leaves workspaceId behind.
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws-1' });
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce(['a', 'b']);
    const res = await request(app).get('/users/entitlements');
    expect(res.body.notionConnected).toBe(false);
    expect(res.body.classSyncUsed).toBe(2);
    expect(res.body.syncedCourseIds).toEqual(['a', 'b']);
    expect(getSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('falls back to the per-uid ledger and reports notionConnected false when there is no workspaceId', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    getSyncedCourseIdsMock.mockResolvedValueOnce(['x']);
    const res = await request(app).get('/users/entitlements');
    expect(res.body.classSyncUsed).toBe(1);
    expect(res.body.syncedCourseIds).toEqual(['x']);
    expect(res.body.notionConnected).toBe(false);
    expect(getWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
  });
});
