import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock, getSyncedCourseIdsMock, getWorkspaceSyncedCourseIdsMock, workspaceLedgerExistsMock, addWorkspaceSyncedCourseIdsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getSyncedCourseIdsMock: vi.fn(),
  getWorkspaceSyncedCourseIdsMock: vi.fn(),
  workspaceLedgerExistsMock: vi.fn(),
  addWorkspaceSyncedCourseIdsMock: vi.fn(),
}));
vi.mock('../src/billing/store', () => ({ getUser: getUserMock }));
vi.mock('../src/notion_api/classSyncStore', () => ({
  getSyncedCourseIds: getSyncedCourseIdsMock,
  getWorkspaceSyncedCourseIds: getWorkspaceSyncedCourseIdsMock,
  workspaceLedgerExists: workspaceLedgerExistsMock,
  addWorkspaceSyncedCourseIds: addWorkspaceSyncedCourseIdsMock,
}));

import { partitionRequestedCourses } from '../src/notion_api/classSyncGuard';

beforeEach(() => {
  getUserMock.mockReset();
  getSyncedCourseIdsMock.mockReset();
  getWorkspaceSyncedCourseIdsMock.mockReset();
  workspaceLedgerExistsMock.mockReset();
  addWorkspaceSyncedCourseIdsMock.mockReset();
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

  it('free + workspaceId: caps against the workspace ledger, not the per-uid ledger', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws1' });
    workspaceLedgerExistsMock.mockResolvedValueOnce(true);
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce(['1', '2', '3', '4', '5']);
    const req = [{ id: 5, name: 'E' }, { id: 6, name: 'F' }];
    const res = await partitionRequestedCourses('u1', req, 'ws1');
    expect(res.allowed.map(c => c.id)).toEqual([5]);   // already-synced passes
    expect(res.rejected.map(c => c.id)).toEqual([6]);   // new, over cap
    expect(res.shouldRecord).toBe(true);
    expect(getSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('free + workspaceId, ledger already exists: does NOT seed from the per-uid ledger', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws1' });
    workspaceLedgerExistsMock.mockResolvedValueOnce(true);
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce([]);
    await partitionRequestedCourses('u1', [{ id: 1, name: 'A' }], 'ws1');
    expect(addWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('free + workspaceId, fresh workspace: seeds the workspace ledger from the per-uid ledger once', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws1' });
    workspaceLedgerExistsMock.mockResolvedValueOnce(false);
    getSyncedCourseIdsMock.mockResolvedValueOnce(['10', '11']);        // legacy locked-in classes
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce(['10', '11']); // after seeding
    const req = [{ id: 10, name: 'X' }, { id: 12, name: 'Y' }];
    const res = await partitionRequestedCourses('u1', req, 'ws1');
    expect(addWorkspaceSyncedCourseIdsMock).toHaveBeenCalledWith('ws1', ['10', '11']);
    expect(res.allowed.map(c => c.id)).toEqual([10, 12]); // 10 already synced, 12 is slot 3
    expect(res.shouldRecord).toBe(true);
  });

  it('free + workspaceId, fresh workspace with no legacy classes: does not call the seed writer', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free', workspaceId: 'ws1' });
    workspaceLedgerExistsMock.mockResolvedValueOnce(false);
    getSyncedCourseIdsMock.mockResolvedValueOnce([]);
    getWorkspaceSyncedCourseIdsMock.mockResolvedValueOnce([]);
    await partitionRequestedCourses('u1', [{ id: 1, name: 'A' }], 'ws1');
    expect(addWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('free + no workspaceId: unchanged per-uid behaviour', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'free' });
    getSyncedCourseIdsMock.mockResolvedValueOnce(['1', '2', '3', '4', '5']);
    const res = await partitionRequestedCourses('u1', [{ id: 6, name: 'F' }], undefined);
    expect(res.rejected.map(c => c.id)).toEqual([6]);
    expect(res.shouldRecord).toBe(true);
    expect(getWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
  });

  it('paid + workspaceId: no cap, does not record, touches no workspace ledger', async () => {
    getUserMock.mockResolvedValueOnce({ tier: 'pro', workspaceId: 'ws1' });
    getSyncedCourseIdsMock.mockResolvedValueOnce([]);
    const req = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `C${i + 1}` }));
    const res = await partitionRequestedCourses('u1', req, 'ws1');
    expect(res.allowed).toHaveLength(8);
    expect(res.shouldRecord).toBe(false);
    expect(getWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
    expect(addWorkspaceSyncedCourseIdsMock).not.toHaveBeenCalled();
  });
});
