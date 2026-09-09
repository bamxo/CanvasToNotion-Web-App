import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getUserMock, getSyncedCourseIdsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getSyncedCourseIdsMock: vi.fn(),
}));
vi.mock('../src/billing/store', () => ({ getUser: getUserMock }));
vi.mock('../src/notion_api/classSyncStore', () => ({ getSyncedCourseIds: getSyncedCourseIdsMock }));

import { getEntitlements } from '../src/billing/billingController';

const app = express();
app.use(express.json());
app.get('/users/entitlements', (req: any, _res, next) => { req.user = { uid: 'u1', email: 'a@b.com' }; next(); }, getEntitlements as any);

beforeEach(() => {
  getUserMock.mockReset();
  getSyncedCourseIdsMock.mockReset();
  getSyncedCourseIdsMock.mockResolvedValue([]);
});

describe('GET /users/entitlements', () => {
  it('returns free entitlements when the user has no tier', async () => {
    getUserMock.mockResolvedValueOnce({});
    const res = await request(app).get('/users/entitlements');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      tier: 'free', showAds: true, hasProFeatures: false,
      classSyncLimit: 5, classSyncUsed: 0, syncedCourseIds: [],
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
      plan: { subscriptionStatus: 'active', currentPeriodEnd: 123, cancelAtPeriodEnd: false },
    });
    expect(JSON.stringify(res.body)).not.toContain('cus_1');
  });

  it('includes lifetimeRefundEligibleUntil for a lifetime user', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'lifetime', billing: { lifetimeRefundEligibleUntil: 999 } });
    const res = await request(app).get('/users/entitlements');
    expect(res.body.plan).toEqual({ lifetimeRefundEligibleUntil: 999 });
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
});
