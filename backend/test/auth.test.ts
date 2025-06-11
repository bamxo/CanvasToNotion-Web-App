import { verifyToken } from '../public/middleware/auth';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { FirebaseUser } from '../public/types';
import { describe, beforeEach, it, expect, vi, test} from 'vitest';
vi.mock('axios');
const mockedAxios = axios as unknown as { post: ReturnType<typeof vi.fn> };

describe('verifyToken middleware', () => {
  let req: any;
  let res: any;
  let next: NextFunction & { mockImplementation: any; mockClear: any };

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer fakeToken',
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    }as unknown as Response; 

    next = vi.fn() as unknown as NextFunction & { mockImplementation: any; mockClear: any };
  });

  it('should call next if token is valid', async () => {
    const mockUser: FirebaseUser = {
      localId: '12345',
      email: 'test@example.com',
      emailVerified: true
      // add other fields as required
    };

    mockedAxios.post.mockResolvedValueOnce({ data: { users: [mockUser] } });

    await verifyToken(req as any, res as any, next);

    expect(mockedAxios.post).toHaveBeenCalled();
    expect((req as any).user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { users: [] } });

    await verifyToken(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if no token is provided', async () => {
    req.headers = {};

    await verifyToken(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No authentication token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 on axios error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Request failed'));

    await verifyToken(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    expect(next).not.toHaveBeenCalled();
  });
});