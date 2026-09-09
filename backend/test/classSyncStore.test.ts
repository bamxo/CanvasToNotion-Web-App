import { describe, expect, it, vi, beforeEach } from 'vitest';

const { refMock, db } = vi.hoisted(() => {
  const nodes = new Map<string, any>();
  const refMock = vi.fn((path: string) => ({
    async once(_evt: string) {
      return { val: () => nodes.get(path) ?? null };
    },
    async update(patch: Record<string, unknown>) {
      nodes.set(path, { ...(nodes.get(path) ?? {}), ...patch });
    },
  }));
  return { refMock, db: { ref: refMock, __nodes: nodes } };
});

vi.mock('../src/config/firebaseAdmin', () => ({ getDatabase: () => db }));

import { getSyncedCourseIds, addSyncedCourseIds } from '../src/notion_api/classSyncStore';

beforeEach(() => {
  (db as any).__nodes.clear();
  refMock.mockClear();
});

describe('classSyncStore', () => {
  it('returns an empty list for a user with no synced classes', async () => {
    expect(await getSyncedCourseIds('u1')).toEqual([]);
  });

  it('adds course ids and returns them as a deduped list', async () => {
    await addSyncedCourseIds('u1', ['101', '102']);
    expect(await getSyncedCourseIds('u1')).toEqual(expect.arrayContaining(['101', '102']));

    await addSyncedCourseIds('u1', ['102', '103']);
    const ids = await getSyncedCourseIds('u1');
    expect(new Set(ids)).toEqual(new Set(['101', '102', '103']));
  });

  it('coerces numeric ids to strings', async () => {
    await addSyncedCourseIds('u1', [101, 102]);
    expect(await getSyncedCourseIds('u1')).toEqual(expect.arrayContaining(['101', '102']));
  });

  it('stores an ISO date as the value and never overwrites it on re-sync', async () => {
    await addSyncedCourseIds('u1', ['101']);
    const first = (db as any).__nodes.get('users/u1/classSync/courses')['101'];
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    await new Promise((r) => setTimeout(r, 5));
    await addSyncedCourseIds('u1', ['101', '102']);
    const node = (db as any).__nodes.get('users/u1/classSync/courses');
    expect(node['101']).toBe(first); // unchanged
    expect(node['102']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('is a no-op for an empty id list', async () => {
    await addSyncedCourseIds('u1', []);
    expect(refMock).not.toHaveBeenCalled();
  });

  it('scopes storage per user', async () => {
    await addSyncedCourseIds('u1', ['1']);
    await addSyncedCourseIds('u2', ['2']);
    expect(await getSyncedCourseIds('u1')).toEqual(['1']);
    expect(await getSyncedCourseIds('u2')).toEqual(['2']);
  });
});
