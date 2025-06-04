import request from 'supertest';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';
import { describe, beforeEach, it, expect, vi, test} from 'vitest';
import { adminDb } from '../public/db'; // Adjust path if needed

vi.mock('firebase-admin', () => {
  const valMock = vi.fn(() => 'mocked data');

  const refMock = vi.fn(() => ({
    once: vi.fn().mockResolvedValue({ val: valMock }),
  }));

  const databaseMock = vi.fn(() => ({
    ref: refMock,
  }));

  return {
    initializeApp: vi.fn(),
    credential: {
      cert: vi.fn(),
    },
    apps: [],
    database: databaseMock,
  };
});

describe('Firebase DB mock test', () => {
  it('should return mocked data from once()', async () => {
    const snapshot = await adminDb.ref('some/path').once('value');
    expect(snapshot.val()).toBe('mocked data');
  });
});