import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useEntitlements } from './useEntitlements';

vi.mock('axios');
vi.mock('../utils/encryption', () => ({ secureGetToken: vi.fn(() => 'tok') }));
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

beforeEach(() => { (axios as any).get = vi.fn(); });

const renderWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useEntitlements(), { wrapper });
};

describe('useEntitlements', () => {
  it('loads entitlements and exposes tier + plan', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'pro', showAds: false, hasProFeatures: true, plan: { subscriptionStatus: 'active' } },
    });
    const { result } = renderWithClient();
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
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.memberSince).toBe('2024-01-15T00:00:00.000Z');
  });

  it('exposes classSyncUsed/classSyncLimit when the server includes them', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'free', showAds: true, hasProFeatures: false, classSyncUsed: 3, classSyncLimit: 5 },
    });
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.classSyncUsed).toBe(3);
    expect(result.current.classSyncLimit).toBe(5);
  });

  it('defaults classSyncUsed to 0 and classSyncLimit to null when the server omits them', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'pro', showAds: false, hasProFeatures: true },
    });
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.classSyncUsed).toBe(0);
    expect(result.current.classSyncLimit).toBeNull();
  });

  it('exposes notionConnected when the server includes it', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'free', showAds: true, hasProFeatures: false, notionConnected: true },
    });
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notionConnected).toBe(true);
  });

  it('defaults notionConnected to false when the server omits it', async () => {
    (axios as any).get.mockResolvedValueOnce({
      data: { tier: 'free', showAds: true, hasProFeatures: false },
    });
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notionConnected).toBe(false);
  });

  it('surfaces an error and defaults to free', async () => {
    (axios as any).get.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.tier).toBe('free');
    expect(result.current.showAds).toBe(true);
  });
});
