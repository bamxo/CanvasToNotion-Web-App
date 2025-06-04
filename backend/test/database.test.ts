import express from 'express';
import request from 'supertest';
import { describe, beforeEach, it, expect, vi, test} from 'vitest';

// Mock the middleware and controller
vi.mock('../public/middleware/auth', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'mock-user' };
    return next();
  }
}));

vi.mock('../public/controllers/databaseControllers', () => ({
  updateData: vi.fn((req:any, res:any) => {
    res.json({ message: `Updated ${req.params.path}`, body: req.body });
  }),
  readData: vi.fn((req:any, res:any) => {
    res.json({ message: `Read ${req.params.path}`, data: { value: 42 } });
  }),
  deleteData: vi.fn((req:any, res:any) => {
    res.json({ message: `Deleted ${req.params.path}` });
  })
}));

import databaseRoutes from '../public/routes/database';

const app = express();
app.use(express.json());
app.use('/api/data', databaseRoutes);

describe('Database Routes', () => {
  it('PUT /api/data/somepath - should update data', async () => {
    const res = await request(app)
      .put('/api/data/somepath')
      .send({ value: 'new' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Updated somepath',
      body: { value: 'new' }
    });
  });

  it('GET /api/data/somepath - should read data', async () => {
    const res = await request(app).get('/api/data/somepath');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Read somepath',
      data: { value: 42 }
    });
  });

  it('DELETE /api/data/somepath - should delete data', async () => {
    const res = await request(app).delete('/api/data/somepath');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Deleted somepath'
    });
  });
});
