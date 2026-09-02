import { describe, it, expect, vi } from 'vitest';
import { adminDb } from '../src/db'; // Adjust path if needed

vi.mock('firebase-admin', () => {
  const valMock = vi.fn(() => 'mocked data');

  const refMock = vi.fn(() => ({
    once: vi.fn().mockResolvedValue({ val: valMock }),
  }));

  const databaseMock = vi.fn(() => ({
    ref: refMock,
  }));

  // The unified initialiser (src/config/firebaseAdmin.ts) calls
  // admin.initializeApp() and then .database() on the returned app.
  const appMock = { database: databaseMock };

  return {
    initializeApp: vi.fn(() => appMock),
    app: vi.fn(() => appMock),
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
