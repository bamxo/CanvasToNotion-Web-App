import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));
vi.mock('../src/config/firebaseAdmin', () => ({
  admin: { auth: () => ({ getUser: getUserMock }) },
}));

import { formatUsd, formatDate, getRecipientEmail } from '../src/billing/notify';

describe('formatUsd', () => {
  it('formats whole-dollar cents', () => {
    expect(formatUsd(1000)).toBe('$10.00');
  });
  it('formats cents with a fractional part', () => {
    expect(formatUsd(499)).toBe('$4.99');
  });
  it('returns null for a missing amount', () => {
    expect(formatUsd(null)).toBeNull();
    expect(formatUsd(undefined)).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats an epoch-seconds timestamp as a US long date in UTC', () => {
    // 2026-03-14T00:00:00Z
    expect(formatDate(1773446400)).toBe('March 14, 2026');
  });
  it('returns null for a missing timestamp', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
  });
});

describe('getRecipientEmail', () => {
  beforeEach(() => getUserMock.mockReset());

  it('returns the auth record email for the uid', async () => {
    getUserMock.mockResolvedValueOnce({ email: 'person@example.com' });
    await expect(getRecipientEmail('uid_1')).resolves.toBe('person@example.com');
    expect(getUserMock).toHaveBeenCalledWith('uid_1');
  });

  it('returns null when the account has no email', async () => {
    getUserMock.mockResolvedValueOnce({});
    await expect(getRecipientEmail('uid_1')).resolves.toBeNull();
  });

  it('returns null instead of throwing when the lookup fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getUserMock.mockRejectedValueOnce(new Error('user-not-found'));
    await expect(getRecipientEmail('uid_1')).resolves.toBeNull();
    warn.mockRestore();
  });
});
