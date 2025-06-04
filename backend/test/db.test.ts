import request from 'supertest';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';
import { describe, beforeEach, it, expect, jest, test} from '@jest/globals';
import { adminDb } from '../public/db'; // Adjust path if needed

jest.mock('firebase-admin', () => {
  const valMock = jest.fn(() => 'mocked data');

  const refMock = jest.fn(() => ({
    once: jest.fn().mockResolvedValue({ val: valMock }),
  }));

  const databaseMock = jest.fn(() => ({
    ref: refMock,
  }));

  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
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