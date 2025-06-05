import request from 'supertest';
import axios from 'axios';
import express from 'express';
import { app } from '../src/server';
import dotenv from 'dotenv';
import { describe, beforeEach, it, expect, vi, test} from 'vitest';

vi.mock('axios');
dotenv.config();
describe('POST /api/notion/token', () => {
  const mockedAxios = axios as unknown as { post: ReturnType<typeof vi.fn> };

  it('should return access token and workspace ID on success', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'mocked_access_token',
        workspace_id: 'mocked_workspace_id'
      }
    });

    const res = await request(app).post('/api/notion/token');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      accessToken: 'mocked_access_token',
      workspaceId: 'mocked_workspace_id'
    });
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('should return error on failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        data: 'Unauthorized'
      }
    });

    const res = await request(app).post('/api/notion/token');

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'Failed to authenticate with Notion'
    });
  });
});