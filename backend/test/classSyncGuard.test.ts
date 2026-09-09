import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, getSyncedCourseIdsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getSyncedCourseIdsMock: vi.fn(),
}));
vi.mock('../src/billing/store', () => ({ getUser: getUserMock }));
vi.mock('../src/notion_api/classSyncStore', () => ({ getSyncedCourseIds: getSyncedCourseIdsMock }));

import { partitionRequestedCourses } from '../src/notion_api/classSyncGuard';

beforeEach(() => {
  getUserMock.mockReset();
  getSyncedCourseIdsMock.mockReset();
});

describe('partitionRequestedCourses', () => {
  it('allows everything and does NOT record for an unlimited (pro) tier', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro' });
    getSyncedCourseIdsMock.mockResolvedValueOnce([]);
    const req = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' },
                 { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }];
    const res = await partitionRequestedCourses('u1', req);
    expect(res.allowed).toHaveLength(6);
    expect(res.rejected).toHaveLength(0);
    expect(res.shouldRecord).toBe(false);
  });

  it.each(['lifetime', 'legacy'] as const)(
    'does NOT record for the unlimited %s tier',
    async (tier) => {
      getUserMock.mockResolvedValueOnce({ tier });
      getSyncedCourseIdsMock.mockResolvedValueOnce([]);
      const res = await partitionRequestedCourses('u1', [{ id: 1, name: 'A' }]);
      expect(res.allowed.map(c => c.id)).toEqual([1]);
      expect(res.shouldRecord).toBe(false);
    },
  );

  it('rejects new free-tier courses past the 5 cap but keeps already-synced ones, and records', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    getSyncedCourseIdsMock.mockResolvedValueOnce(['1', '2', '3']);
    const req = [{ id: 1, name: 'A' }, { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }];
    const res = await partitionRequestedCourses('u1', req);
    expect(res.allowed.map(c => c.id)).toEqual([1, 4, 5]);
    expect(res.rejected.map(c => c.id)).toEqual([6]);
    expect(res.shouldRecord).toBe(true);
  });

  it('treats a missing tier as free and records', async () => {
    getUserMock.mockResolvedValueOnce({});
    getSyncedCourseIdsMock.mockResolvedValueOnce([]);
    const req = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `C${i + 1}` }));
    const res = await partitionRequestedCourses('u1', req);
    expect(res.allowed).toHaveLength(5);
    expect(res.rejected.map(c => c.id)).toEqual([6, 7]);
    expect(res.shouldRecord).toBe(true);
  });
});
