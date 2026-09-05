import { UserTier } from '../types';

export type Entitlements = {
  tier: UserTier;
  showAds: boolean;
  hasProFeatures: boolean;
};

const AD_FREE: ReadonlySet<UserTier> = new Set<UserTier>(['pro', 'lifetime', 'legacy']);

export function entitlementsForTier(tier: UserTier | undefined): Entitlements {
  const resolved: UserTier =
    tier === 'pro' || tier === 'lifetime' || tier === 'legacy' ? tier : 'free';
  const adFree = AD_FREE.has(resolved);
  return { tier: resolved, showAds: !adFree, hasProFeatures: adFree };
}
