import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { useEntitlements } from '../hooks/useEntitlements';

vi.mock('axios');
vi.mock('../utils/encryption', () => ({ secureGetToken: vi.fn(() => 'tok') }));
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

beforeEach(() => { (axios as any).get = vi.fn(); });

describe('useEntitlements', () => {
  it('loads entitlements and exposes tier + plan', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'pro', showAds: false, hasProFeatures: true, plan: { subscriptionStatus: 'active' } },
    });
    const { result } = renderHook(() => useEntitlements());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tier).toBe('pro');
    expect(result.current.showAds).toBe(false);
    expect(result.current.plan).toEqual({ subscriptionStatus: 'active' });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/users/entitlements'),
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } })
    );
  });

  it('exposes memberSince when the server includes it', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'legacy', showAds: false, hasProFeatures: true, memberSince: '2024-01-15T00:00:00.000Z' },
    });
    const { result } = renderHook(() => useEntitlements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.memberSince).toBe('2024-01-15T00:00:00.000Z');
  });

  it('surfaces an error and defaults to free', async () => {
    (axios as any).get.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useEntitlements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.tier).toBe('free');
    expect(result.current.showAds).toBe(true);
  });
});
