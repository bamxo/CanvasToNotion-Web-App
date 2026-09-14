// src/notion_api/classSyncStore.ts
//
// Persists which Canvas course ids a FREE-tier user has synced to Notion, at
// `users/{uid}/classSync/courses/{courseId} = "<ISO date first synced>"` (an
// object of `{ "<courseId>": "2026-09-05T..." , ... }`, created lazily on the
// first successful free-tier sync). This is the durable record
// `classSyncLimit.ts`'s partitioning checks against (by key), and what
// `GET /users/entitlements` reads to report usage. The date value orders the
// locked-in 5 and is never overwritten on re-sync.
//
// Only the free tier writes here — see classSyncGuard.ts. Pro / lifetime / legacy
// accounts are unlimited and never create this node, so the free cap only ever
// sees the (max 5) classes a user synced while actually on the free plan.
import { getDatabase } from '../config/firebaseAdmin';

const db = () => getDatabase();

// Stored value is the ISO 8601 timestamp of the *first* sync of that course.
export async function getSyncedCourseIds(uid: string): Promise<string[]> {
  const snap = await db().ref(`users/${uid}/classSync/courses`).once('value');
  const value = snap.val() as Record<string, string> | null;
  return value ? Object.keys(value) : [];
}

export async function addSyncedCourseIds(
  uid: string,
  courseIds: readonly (string | number)[]
): Promise<void> {
  if (courseIds.length === 0) return;
  const ref = db().ref(`users/${uid}/classSync/courses`);
  const existing = (await ref.once('value')).val() as Record<string, string> | null;
  const syncedAt = new Date().toISOString();
  // Only write ids we haven't seen before — a re-sync must not overwrite the
  // original "first synced" date, which is what orders the locked-in 5.
  const updates: Record<string, string> = {};
  for (const id of courseIds) {
    const key = String(id);
    if (!existing || existing[key] === undefined) {
      updates[key] = syncedAt;
    }
  }
  if (Object.keys(updates).length > 0) {
    await ref.update(updates);
  }
}

// --- Workspace-scoped ledger ---------------------------------------------------
// Same semantics as the per-uid functions above, but keyed on the Notion
// workspace id (see billing/... and notionRouter `/notion/token`). This is the
// source of truth for the free-tier cap; a re-sync never rewrites a course's
// original "first synced" date.

const workspaceCoursesPath = (workspaceId: string) =>
  `notionWorkspaceSync/${workspaceId}/courses`;

export async function getWorkspaceSyncedCourseIds(workspaceId: string): Promise<string[]> {
  const snap = await db().ref(workspaceCoursesPath(workspaceId)).once('value');
  const value = snap.val() as Record<string, string> | null;
  return value ? Object.keys(value) : [];
}

export async function workspaceLedgerExists(workspaceId: string): Promise<boolean> {
  const snap = await db().ref(`notionWorkspaceSync/${workspaceId}`).once('value');
  return snap.val() != null;
}

export async function addWorkspaceSyncedCourseIds(
  workspaceId: string,
  courseIds: readonly (string | number)[]
): Promise<void> {
  if (courseIds.length === 0) return;
  const coursesRef = db().ref(workspaceCoursesPath(workspaceId));
  const existing = (await coursesRef.once('value')).val() as Record<string, string> | null;
  const syncedAt = new Date().toISOString();
  const updates: Record<string, string> = {};
  for (const id of courseIds) {
    const key = String(id);
    if (!existing || existing[key] === undefined) {
      updates[key] = syncedAt;
    }
  }
  if (Object.keys(updates).length === 0) return;
  await coursesRef.update(updates);
  if (!existing) {
    // First time this ledger is created — stamp the parent node.
    await db().ref(`notionWorkspaceSync/${workspaceId}`).update({ createdAt: syncedAt });
  }
}

// The single place that decides which ledger a free-tier sync records against.
// Keeps the branch out of the /sync and /sync-v2 handlers.
export async function recordSyncedCourses(opts: {
  uid: string;
  workspaceId?: string;
  courseIds: readonly (string | number)[];
}): Promise<void> {
  if (opts.courseIds.length === 0) return;
  if (opts.workspaceId) {
    await addWorkspaceSyncedCourseIds(opts.workspaceId, opts.courseIds);
  } else {
    await addSyncedCourseIds(opts.uid, opts.courseIds);
  }
}
