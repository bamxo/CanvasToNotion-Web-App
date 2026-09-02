import { describe, beforeEach, it, expect, vi } from 'vitest';
import type { NextFunction, Response } from 'express';

// The middleware now verifies Firebase ID tokens with the Admin SDK
// (admin.auth().verifyIdToken) instead of the identitytoolkit REST call.
const verifyIdToken = vi.fn();
vi.mock('../src/config/firebaseAdmin', () => ({
  admin: {
    auth: () => ({ verifyIdToken }),
  },
  getFirebaseAdmin: vi.fn(),
}));

import { verifyToken } from '../src/middleware/auth';

describe('verifyToken middleware', () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    verifyIdToken.mockReset();
    req = {
      headers: { authorization: 'Bearer fakeToken' },
      cookies: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    next = vi.fn() as unknown as NextFunction;
  });

  it('should call next and populate req.user when the token is valid', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: '12345',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/p.png',
      email_verified: true,
    });

    await verifyToken(req, res, next);

    expect(verifyIdToken).toHaveBeenCalledWith('fakeToken');
    expect(req.user).toEqual({
      uid: '12345',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/p.png',
      emailVerified: true,
    });
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to the authToken cookie when there is no header', async () => {
    req.headers = {};
    req.cookies = { authToken: 'cookieToken' };
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'c@example.com' });

    await verifyToken(req, res, next);

    expect(verifyIdToken).toHaveBeenCalledWith('cookieToken');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 with "Invalid token" when verification fails', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('token expired'));

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when no token is provided', async () => {
    req.headers = {};
    req.cookies = {};

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No authentication token provided' });
    expect(next).not.toHaveBeenCalled();
  });
});
