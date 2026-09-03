import { describe, expect, it } from 'vitest';
import { computeLegacyBackfill } from '../src/utils/backfillLegacyTier';

describe('computeLegacyBackfill', () => {
  it('assigns legacy to every user that has no tier', () => {
    const result = computeLegacyBackfill({
      uidA: { email: 'a@example.com' },
      uidB: { email: 'b@example.com' }
    });

    expect(result).toEqual({
      'users/uidA/tier': 'legacy',
      'users/uidB/tier': 'legacy'
    });
  });

  it('skips users that already have a tier', () => {
    const result = computeLegacyBackfill({
      uidFree: { tier: 'free' },
      uidPro: { tier: 'pro' },
      uidLegacy: { tier: 'legacy' },
      uidNone: { email: 'none@example.com' }
    });

    expect(result).toEqual({ 'users/uidNone/tier': 'legacy' });
  });

  it('returns an empty map when there are no users', () => {
    expect(computeLegacyBackfill(null)).toEqual({});
    expect(computeLegacyBackfill({})).toEqual({});
  });

  it('skips null user nodes', () => {
    expect(computeLegacyBackfill({ uidGhost: null })).toEqual({});
  });
});
