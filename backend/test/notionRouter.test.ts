import { describe, beforeEach, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---- Mocks -------------------------------------------------------------------

// Fake Realtime Database handle. Each call to ref(path) returns a lightweight
// query/snapshot stub driven by the `refBehaviour` map below.
const { refBehaviour, adminDb, verifyToken, axiosPost } = vi.hoisted(() => {
  const refBehaviour: Record<string, any> = {};

  const makeSnapshot = (value: any) => ({
    exists: () => value !== null && value !== undefined,
    val: () => value,
  });

  const adminDb = {
    ref: vi.fn((path: string) => {
      const cfg = refBehaviour[path] || {};
      return {
        orderByChild: () => ({
          equalTo: () => ({
            once: async () => makeSnapshot(cfg.queryVal ?? null),
          }),
        }),
        once: async () => makeSnapshot(cfg.val ?? null),
        update: vi.fn(async () => undefined),
        set: vi.fn(async () => undefined),
        remove: vi.fn(async () => undefined),
      };
    }),
  };

  const verifyToken = vi.fn((req: any, _res: any, next: any) => {
    req.user = { uid: 'uid-1', email: 'user@example.com' };
    next();
  });

  const axiosPost = vi.fn();

  return { refBehaviour, adminDb, verifyToken, axiosPost };
});

vi.mock('../public/db', () => ({ adminDb }));
vi.mock('../public/middleware/auth', () => ({ verifyToken }));
vi.mock('axios', () => ({ default: { post: (...args: any[]) => axiosPost(...args) } }));

// ---- Helpers ---------------------------------------------------------------

import notionRouter from '../public/notion_api/notionRouter';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/notion', notionRouter);
  return app;
};

beforeEach(() => {
  for (const k of Object.keys(refBehaviour)) delete refBehaviour[k];
  verifyToken.mockImplementation((req: any, _res: any, next: any) => {
    req.user = { uid: 'uid-1', email: 'user@example.com' };
    next();
  });
  axiosPost.mockReset();
  adminDb.ref.mockClear();
});

// ---- Tests ---------------------------------------------------------------------

describe('GET /notion/sync-status', () => {
  it('returns the stored status plus a formatted message', async () => {
    refBehaviour['users'] = { queryVal: { 'uid-1': { email: 'user@example.com' } } };
    refBehaviour['users/uid-1/syncStatus'] = {
      val: {
        status: 'complete',
        results: { newAssignmentsCreated: 3, skippedAssignments: 2 },
        completedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const res = await request(buildApp()).get('/notion/sync-status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      syncStatus: {
        status: 'complete',
        results: { newAssignmentsCreated: 3, skippedAssignments: 2 },
        completedAt: '2026-01-01T00:00:00.000Z',
        message: 'Sync completed: 3 assignments created, 2 already existed.',
      },
    });
  });

  it('404s when the user has no syncStatus node', async () => {
    refBehaviour['users'] = { queryVal: { 'uid-1': { email: 'user@example.com' } } };

    const res = await request(buildApp()).get('/notion/sync-status');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'No sync status found' });
  });

  it('404s when the user is not found', async () => {
    const res = await request(buildApp()).get('/notion/sync-status');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'User not found' });
  });
});

describe('POST /notion/token', () => {
  it('stores the token and returns the lean response shape', async () => {
    refBehaviour['users'] = { queryVal: { 'uid-1': { email: 'user@example.com' } } };
    axiosPost.mockResolvedValueOnce({
      data: { access_token: 'secret-token', workspace_id: 'ws-1' },
    });

    const res = await request(buildApp()).post('/notion/token').send({ code: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      updated: true,
      message: 'Notion token stored successfully',
    });
    // Lean parity: no accessToken / accessibleResources leaked in the body.
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('accessibleResources');
  });

  it('400s without a code', async () => {
    const res = await request(buildApp()).post('/notion/token').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('auth gate', () => {
  it('401s when verifyToken rejects the request', async () => {
    verifyToken.mockImplementation((_req: any, res: any) => {
      res.status(401).json({ error: 'No authentication token provided' });
    });

    const res = await request(buildApp()).get('/notion/sync-status');
    expect(res.status).toBe(401);
  });
});
