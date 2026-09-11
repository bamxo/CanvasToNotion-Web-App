// backend/src/notion_api/classSyncGuard.ts
//
// One place both /notion/sync and /notion/sync-v2 call to apply the free-tier
// class-sync cap. The cap is counted PER NOTION WORKSPACE (the `workspaceId`
// the caller passes, sourced server-side from the Notion OAuth token exchange
// and stored on the user record — never from a request body). A second C2N
// account that connects the same workspace shares one ledger.
//
// The first time a workspace is seen, its ledger is seeded from the caller's
// legacy per-uid ledger (`users/{uid}/classSync/courses`) so an existing free
// user keeps their locked-in classes. After that the workspace ledger is the
// sole source of truth. Callers with no `workspaceId` (legacy users who have
// not reconnected Notion) keep the original per-uid behaviour.
//
// Only the free tier has a cap, so only the free tier records synced classes.
import { getUser } from '../billing/store';
import { entitlementsForTier } from '../billing/tierRules';
import {
  getSyncedCourseIds,
  getWorkspaceSyncedCourseIds,
  workspaceLedgerExists,
  addWorkspaceSyncedCourseIds,
} from './classSyncStore';
import { partitionCoursesByLimit, CourseRef, PartitionResult } from './classSyncLimit';

export interface ClassSyncDecision<T extends CourseRef> extends PartitionResult<T> {
  // True only on the free tier — the only tier whose synced classes are stored.
  shouldRecord: boolean;
}

export async function partitionRequestedCourses<T extends CourseRef>(
  uid: string,
  requestedCourses: readonly T[],
  workspaceId?: string
): Promise<ClassSyncDecision<T>> {
  const { tier } = await getUser(uid);
  const limit = entitlementsForTier(tier).classSyncLimit;

  let alreadySynced: string[];
  if (workspaceId && limit !== null) {
    if (!(await workspaceLedgerExists(workspaceId))) {
      // Seed once from the caller's legacy per-uid ledger.
      const legacyIds = await getSyncedCourseIds(uid);
      if (legacyIds.length > 0) {
        await addWorkspaceSyncedCourseIds(workspaceId, legacyIds);
      }
    }
    alreadySynced = await getWorkspaceSyncedCourseIds(workspaceId);
  } else {
    alreadySynced = await getSyncedCourseIds(uid);
  }

  const partition = partitionCoursesByLimit(alreadySynced, requestedCourses, limit);
  return { ...partition, shouldRecord: limit !== null };
}
