"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useActiveOrg } from "@/components/ui/ActiveOrgProvider";
import {
  getSubscription,
  isPlanActive,
  hasFeature,
  getPlanTier,
  getTrialDaysLeft,
  type Subscription,
  type FeatureKey,
  type PlanTier,
} from "@/lib/subscription";

interface SubscriptionContextValue {
  subscription: Subscription | null;
  loading: boolean;
  isActive: boolean;
  planTier: PlanTier;
  trialDaysLeft: number;
  hasFeature: (feature: FeatureKey) => boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  isActive: true, // fail-open: access granted while loading
  planTier: "lite",
  trialDaysLeft: 0,
  hasFeature: () => false,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentOrgId } = useActiveOrg();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sub = await getSubscription(currentOrgId);
      setSubscription(sub);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  const value: SubscriptionContextValue = {
    subscription,
    loading,
    isActive: loading ? true : isPlanActive(subscription),
    planTier: getPlanTier(subscription),
    trialDaysLeft: getTrialDaysLeft(subscription),
    hasFeature: (f: FeatureKey) => hasFeature(subscription, f),
    refresh: load,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
