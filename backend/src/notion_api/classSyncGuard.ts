// backend/src/notion_api/classSyncGuard.ts
//
// One place both /notion/sync and /notion/sync-v2 call to apply the free-tier
// class-sync cap: reads the user's tier + limit + already-synced course ids and
// partitions the requested courses into allowed / rejected.
//
// It also decides whether the synced course ids should be *persisted*. Only the
// free tier has a cap, so only the free tier's synced classes are recorded
// (at `users/{uid}/classSync/courses` — see classSyncStore.ts). Pro, lifetime
// and legacy accounts are unlimited and never write a class-sync ledger, so a
// later downgrade to free starts from an empty set of 5 slots.
import { getUser } from '../billing/store';
import { entitlementsForTier } from '../billing/tierRules';
import { getSyncedCourseIds } from './classSyncStore';
import { partitionCoursesByLimit, CourseRef, PartitionResult } from './classSyncLimit';

export interface ClassSyncDecision<T extends CourseRef> extends PartitionResult<T> {
  // True only on the free tier — the only tier whose synced classes are stored.
  shouldRecord: boolean;
}

export async function partitionRequestedCourses<T extends CourseRef>(
  uid: string,
  requestedCourses: readonly T[]
): Promise<ClassSyncDecision<T>> {
  const { tier } = await getUser(uid);
  const limit = entitlementsForTier(tier).classSyncLimit;
  const alreadySynced = await getSyncedCourseIds(uid);
  const partition = partitionCoursesByLimit(alreadySynced, requestedCourses, limit);
  return { ...partition, shouldRecord: limit !== null };
}
