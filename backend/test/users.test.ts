import request from 'supertest';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';
import { describe, beforeEach, it, expect, jest, test} from '@jest/globals';

import userRoutes from '../public/routes/users';


const myRoute = "../public";
// Mock middleware and controller
jest.mock('../public/middleware/auth', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'mock-user' }; // Mocked decoded token
    return next();
  }
}));

jest.mock('../public/controllers/userControllers', () => ({
  getProfile: (req: any, res: any) => {
    return res.json({ name: 'Mock User', id: req.user.id });
  },
  updateProfile: (req: any, res: any) => {
    return res.json({ message: 'Profile updated', data: req.body });
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

  it('PUT /api/profile - should update and return profile data', async () => {
    const updatedData = { name: 'Updated User' };
    const res = await request(app).put('/api/profile').send(updatedData);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Profile updated', data: updatedData });
  });
});