// src/notion_api/classSyncStore.ts
//
// Persists which Canvas course ids a user has ever synced to Notion, at
// `users/{uid}/classSync/courses/{courseId} = true`. This is the durable
// record `classSyncLimit.ts`'s partitioning checks against, and what
// `GET /users/entitlements` reads to report usage.
import { getDatabase } from '../config/firebaseAdmin';

const db = () => getDatabase();

export async function getSyncedCourseIds(uid: string): Promise<string[]> {
  const snap = await db().ref(`users/${uid}/classSync/courses`).once('value');
  const value = snap.val() as Record<string, boolean> | null;
  return value ? Object.keys(value) : [];
}

export async function addSyncedCourseIds(
  uid: string,
  courseIds: readonly (string | number)[]
): Promise<void> {
  if (courseIds.length === 0) return;
  const updates: Record<string, boolean> = {};
  for (const id of courseIds) {
    updates[String(id)] = true;
  }
  await db().ref(`users/${uid}/classSync/courses`).update(updates);
}
