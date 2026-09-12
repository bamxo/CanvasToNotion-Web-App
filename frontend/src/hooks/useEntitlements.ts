import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { USER_ENDPOINTS } from '../utils/api';
import { secureGetToken } from '../utils/encryption';

export type Tier = 'free' | 'pro' | 'lifetime' | 'legacy';

export interface PlanView {
  subscriptionStatus?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  lifetimePurchasedAt?: string;
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
  notionConnected: boolean;
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
  notionConnected: boolean;
};

const FREE: EntitlementsData = {
  tier: 'free',
  showAds: true,
  hasProFeatures: false,
  classSyncUsed: 0,
  classSyncLimit: null,
  notionConnected: false,
};

const fetchEntitlements = async (): Promise<EntitlementsData> => {
  const token = secureGetToken('authToken');
  const res = await axios.get(USER_ENDPOINTS.ENTITLEMENTS, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    tier: res.data.tier ?? 'free',
    showAds: res.data.showAds ?? true,
    hasProFeatures: res.data.hasProFeatures ?? false,
    plan: res.data.plan,
    memberSince: res.data.memberSince,
    classSyncUsed: res.data.classSyncUsed ?? 0,
    classSyncLimit: res.data.classSyncLimit ?? null,
    notionConnected: res.data.notionConnected ?? false,
  };
};

export function useEntitlements(): EntitlementsState {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['entitlements'],
    queryFn: fetchEntitlements,
  });

  return {
    ...(data ?? FREE),
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch: () => { refetch(); },
  };
}
