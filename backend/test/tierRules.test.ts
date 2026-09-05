import { describe, expect, it } from 'vitest';
import { entitlementsForTier } from '../src/billing/tierRules';

describe('entitlementsForTier', () => {
  it('free sees ads and no pro features', () => {
    expect(entitlementsForTier('free')).toEqual({ tier: 'free', showAds: true, hasProFeatures: false });
  });

  it('pro, lifetime and legacy are ad-free with pro features', () => {
    for (const tier of ['pro', 'lifetime', 'legacy'] as const) {
      expect(entitlementsForTier(tier)).toEqual({ tier, showAds: false, hasProFeatures: true });
    }
  });

  it('undefined or unknown tier is treated as free', () => {
    expect(entitlementsForTier(undefined)).toEqual({ tier: 'free', showAds: true, hasProFeatures: false });
    // @ts-expect-error - exercising the runtime fallback
    expect(entitlementsForTier('garbage')).toEqual({ tier: 'free', showAds: true, hasProFeatures: false });
  });
});
