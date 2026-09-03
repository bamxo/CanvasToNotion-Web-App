// src/utils/backfillLegacyTier.ts
// Pure helper behind the one-off `backfill:legacy-tier` script.
//
// Given the raw `users/` object from the Realtime Database, it returns a
// multi-location update map that assigns `tier: 'legacy'` to every user that
// does not already have a tier. Users that already carry any tier are left
// untouched, so the script is idempotent and safe to re-run.
import { LEGACY_TIER, UserTier } from '../types';

type RawUser = { tier?: unknown } | null | undefined;

export function computeLegacyBackfill(
  users: Record<string, RawUser> | null | undefined
): Record<string, UserTier> {
  const updates: Record<string, UserTier> = {};

  if (!users) {
    return updates;
  }

  for (const [uid, user] of Object.entries(users)) {
    if (!user) {
      continue;
    }
    if (user.tier) {
      continue;
    }
    updates[`users/${uid}/tier`] = LEGACY_TIER;
  }

  return updates;
}
