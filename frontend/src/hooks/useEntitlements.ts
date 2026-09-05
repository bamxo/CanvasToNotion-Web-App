import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { USER_ENDPOINTS } from '../utils/api';
import { secureGetToken } from '../utils/encryption';

export type Tier = 'free' | 'pro' | 'lifetime' | 'legacy';

export interface PlanView {
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  lifetimeRefundEligibleUntil?: number;
  refundedAt?: string;
}

interface EntitlementsState {
  tier: Tier;
  showAds: boolean;
  hasProFeatures: boolean;
  plan?: PlanView;
  memberSince?: string;
  classSyncUsed: number;
  classSyncLimit: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

type EntitlementsData = {
  tier: Tier;
  showAds: boolean;
  hasProFeatures: boolean;
  plan?: PlanView;
  memberSince?: string;
  classSyncUsed: number;
  classSyncLimit: number | null;
};

const FREE: EntitlementsData = {
  tier: 'free',
  showAds: true,
  hasProFeatures: false,
  classSyncUsed: 0,
  classSyncLimit: null,
};

export function useEntitlements(): EntitlementsState {
  const [data, setData] = useState<EntitlementsData>(FREE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const token = secureGetToken('authToken');
    axios
      .get(USER_ENDPOINTS.ENTITLEMENTS, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (cancelled) return;
        setData({
          tier: res.data.tier ?? 'free',
          showAds: res.data.showAds ?? true,
          hasProFeatures: res.data.hasProFeatures ?? false,
          plan: res.data.plan,
          memberSince: res.data.memberSince,
          classSyncUsed: res.data.classSyncUsed ?? 0,
          classSyncLimit: res.data.classSyncLimit ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load plan');
        setData(FREE);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { ...data, isLoading, error, refetch };
}
