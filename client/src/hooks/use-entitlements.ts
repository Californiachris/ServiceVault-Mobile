import { useQuery } from "@tanstack/react-query";
import type { UserEntitlements, FeatureKey } from "../../../shared/planFeatures";

export function useEntitlements() {
  const { data, isLoading, error } = useQuery<UserEntitlements>({
    queryKey: ["/api/entitlements"],
    // Default fetcher is already set up in queryClient
  });

  const hasFeature = (feature: FeatureKey): boolean => {
    if (!data) return false;
    return data[feature] as boolean;
  };

  const getLimit = (limitKey: 'maxAssets' | 'maxProperties' | 'monthlyQRQuota'): number => {
    if (!data) return 0;
    return data[limitKey];
  };

  return {
    entitlements: data,
    isLoading,
    error,
    hasFeature,
    getLimit,
    // Convenience properties
    plan: data?.plan || null,
    role: data?.role || 'HOMEOWNER',
    quotaUsed: data?.quotaUsed || 0,
    quotaRemaining: data?.quotaRemaining || 0,
  };
}
