import { UserTier } from '../types';

// Free tier's cap on distinct Canvas courses that may be synced to Notion.
// Paid/legacy tiers are unlimited (classSyncLimit: null).
export const FREE_CLASS_SYNC_LIMIT = 5;

export type Entitlements = {
  tier: UserTier;
  showAds: boolean;
  hasProFeatures: boolean;
  classSyncLimit: number | null;
};

const AD_FREE: ReadonlySet<UserTier> = new Set<UserTier>(['pro', 'lifetime', 'legacy']);

export function entitlementsForTier(tier: UserTier | undefined): Entitlements {
  const resolved: UserTier =
    tier === 'pro' || tier === 'lifetime' || tier === 'legacy' ? tier : 'free';
  const adFree = AD_FREE.has(resolved);
  return {
    tier: resolved,
    showAds: !adFree,
    hasProFeatures: adFree,
    classSyncLimit: adFree ? null : FREE_CLASS_SYNC_LIMIT,
  };
}
