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
