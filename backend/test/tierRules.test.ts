import { describe, expect, it } from 'vitest';
import { entitlementsForTier } from '../src/billing/tierRules';

describe('entitlementsForTier', () => {
  it('free sees ads, no pro features, and a 5-class sync limit', () => {
    expect(entitlementsForTier('free')).toEqual({
      tier: 'free', showAds: true, hasProFeatures: false, classSyncLimit: 5,
    });
  });

  it('pro, lifetime and legacy are ad-free with pro features and unlimited class sync', () => {
    for (const tier of ['pro', 'lifetime', 'legacy'] as const) {
      expect(entitlementsForTier(tier)).toEqual({
        tier, showAds: false, hasProFeatures: true, classSyncLimit: null,
      });
    }
  });

  it('undefined or unknown tier is treated as free', () => {
    expect(entitlementsForTier(undefined)).toEqual({
      tier: 'free', showAds: true, hasProFeatures: false, classSyncLimit: 5,
    });
    // @ts-expect-error - exercising the runtime fallback
    expect(entitlementsForTier('garbage')).toEqual({
      tier: 'free', showAds: true, hasProFeatures: false, classSyncLimit: 5,
    });
  });
});
