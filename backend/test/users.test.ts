import request from 'supertest';
import express from 'express';
import { describe, it, expect, vi } from 'vitest';

import userRoutes from '../src/routes/users';

// Mock middleware and controller
vi.mock('../src/middleware/auth', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { uid: 'mock-user' }; // Mocked decoded token (Admin SDK shape)
    return next();
  }
}));

vi.mock('../src/controllers/userControllers', () => ({
  getProfile: (req: any, res: any) => {
    return res.json({ name: 'Mock User', id: req.user.uid });
  },
  updateProfile: (req: any, res: any) => {
    return res.json({ message: 'Profile updated', data: req.body });
  },
  getUserInfo: (_req: any, res: any) => {
    return res.json({ 
      email: 'mock@example.com', 
      displayName: 'Mock User', 
      photoURL: 'mock-photo-url',
      emailVerified: true 
    });
  }
}));

const app = express();
app.use(express.json());
app.use('/api', userRoutes);

describe('User Routes', () => {
  it('GET /api/profile - should return mocked user profile', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Mock User', id: 'mock-user' });
  });

  it('GET /api/info - should return mocked user info', async () => {
    const res = await request(app).get('/api/info');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ 
      email: 'mock@example.com', 
      displayName: 'Mock User', 
      photoURL: 'mock-photo-url',
      emailVerified: true 
    });
  });

  it('PUT /api/profile - should update and return profile data', async () => {
    const updatedData = { name: 'Updated User' };
    const res = await request(app).put('/api/profile').send(updatedData);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Profile updated', data: updatedData });
  });
});