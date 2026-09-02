import express from 'express';
import request from 'supertest';
import { describe, beforeEach, it, expect, vi } from 'vitest';

// Mock the Admin SDK RTDB access used by the usercount route.
// vi.hoisted keeps these usable inside the hoisted vi.mock factory.
const { once, ref, database } = vi.hoisted(() => {
  const once = vi.fn();
  const ref = vi.fn(() => ({ once }));
  const database = vi.fn(() => ({ ref }));
  return { once, ref, database };
});

vi.mock('../public/config/firebaseAdmin', () => ({
  admin: { database },
  getFirebaseAdmin: vi.fn(),
}));

import usercountRoutes from '../public/routes/usercount';

const makeApp = () => {
  const app = express();
  app.use('/usercount', usercountRoutes);
  return app;
};

describe('usercount route', () => {
  beforeEach(() => {
    once.mockReset();
    once.mockResolvedValue({ numChildren: () => 42 });
  });

  it('GET / returns the RTDB user count', async () => {
    const res = await request(makeApp())
      .get('/usercount')
      .set('x-forwarded-for', '1.2.3.4');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 42 });
    expect(ref).toHaveBeenCalledWith('users');
    expect(once).toHaveBeenCalledWith('value');
  });

  it('GET / returns 500 when the RTDB read fails', async () => {
    once.mockRejectedValueOnce(new Error('boom'));
    const res = await request(makeApp())
      .get('/usercount')
      .set('x-forwarded-for', '5.5.5.5');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch user count' });
  });

  it('rate limits after 30 requests in the window from the same IP', async () => {
    const app = makeApp();
    let last: request.Response | undefined;
    for (let i = 0; i < 31; i++) {
      last = await request(app).get('/usercount').set('x-forwarded-for', '9.9.9.9');
    }
    expect(last!.status).toBe(429);
    expect(last!.body).toEqual({ error: 'Too many requests, please try again later.' });
  });
});
