import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { entitlementService, Entitlements } from "@/services/entitlementService";
import { billingService, Subscription } from "@/services/billingService";
import { useAuth } from "./AuthContext";

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  subscription: Subscription | null;
  isCloudConnected: boolean;
  canUse: (feature: keyof Pick<Entitlements,
    "exports_enabled" | "backup_enabled" | "forms_enabled" |
    "scales_enabled" | "finance_enabled"
  >) => boolean;
  needsAction: boolean;
  fetchEntitlements: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  clearCloud: () => void;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

const DEFAULT_ENTITLEMENTS: Entitlements = {
  exports_enabled: true,
  backup_enabled: true,
  forms_enabled: true,
  scales_enabled: true,
  finance_enabled: true,
  transcription_minutes_per_month: 999,
  max_patients: 999,
  max_sessions_per_month: 999,
  subscription_status: "none",
  is_in_grace: false,
  grace_until: null,
};

export const EntitlementsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const isWife = user?.email === "psi.camilafreitas@gmail.com";

  const isCloudConnected = !!entitlements;

  const canUse = useCallback(
    (feature: keyof Pick<Entitlements,
      "exports_enabled" | "backup_enabled" | "forms_enabled" |
      "scales_enabled" | "finance_enabled"
    >) => {
      if (isWife) return true;
      const e = entitlements || DEFAULT_ENTITLEMENTS;
      return e[feature] === true;
    },
    [entitlements, isWife]
  );

  const effectiveSubscription = isWife
    ? ({ ...subscription, status: "active", plan: "Premium (VIP)" } as Subscription)
    : subscription;

  const needsAction =
    !!effectiveSubscription &&
    (effectiveSubscription.status === "past_due" || effectiveSubscription.status === "canceled") &&
    !isWife;

  const fetchEntitlements = useCallback(async () => {
    const res = await entitlementService.get();
    if (res.success) setEntitlements(res.data);
  }, []);

  const fetchSubscription = useCallback(async () => {
    const res = await billingService.getSubscription();
    if (res.success) setSubscription(res.data);
  }, []);

  const clearCloud = useCallback(() => {
    setEntitlements(null);
    setSubscription(null);
  }, []);

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        subscription: effectiveSubscription,
        isCloudConnected,
        canUse,
        needsAction,
        fetchEntitlements,
        fetchSubscription,
        clearCloud,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  }
  return context;
};
