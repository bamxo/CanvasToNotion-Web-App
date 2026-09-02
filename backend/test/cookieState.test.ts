import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, beforeEach, it, expect, vi } from 'vitest';

// Mock the Admin SDK used by the cookie-state controller's bearer check.
const verifyIdToken = vi.fn();
vi.mock('../public/config/firebaseAdmin', () => ({
  admin: {
    auth: () => ({ verifyIdToken }),
  },
  getFirebaseAdmin: vi.fn(),
}));

import cookieStateRoutes from '../public/routes/cookieState';

const makeApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/cookie-state', cookieStateRoutes);
  return app;
};

describe('cookie-state routes', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('POST /set-authenticated without a bearer token -> 401', async () => {
    const res = await request(makeApp()).post('/cookie-state/set-authenticated');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('POST /set-authenticated with an invalid bearer token -> 401', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('token expired'));
    const res = await request(makeApp())
      .post('/cookie-state/set-authenticated')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('POST /set-authenticated with a valid bearer token sets the isAuthenticated cookie', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });
    const res = await request(makeApp())
      .post('/cookie-state/set-authenticated')
      .set('Authorization', 'Bearer good-token');

    expect(verifyIdToken).toHaveBeenCalledWith('good-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Authentication cookie set' });

    const setCookie = ([] as string[]).concat(res.headers['set-cookie']).join(';');
    expect(setCookie).toMatch(/isAuthenticated=true/);
    expect(setCookie).toMatch(/Path=\//);
  });

  it('POST /clear-authenticated works without authentication', async () => {
    const res = await request(makeApp()).post('/cookie-state/clear-authenticated');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Authentication cookie cleared' });

    const setCookie = ([] as string[]).concat(res.headers['set-cookie']).join(';');
    expect(setCookie).toMatch(/isAuthenticated=;/);
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
