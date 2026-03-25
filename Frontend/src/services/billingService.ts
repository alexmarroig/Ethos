// Control Plane Billing Service
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";

export interface Subscription {
  status: "trialing" | "active" | "past_due" | "canceled" | "none";
  plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  portal_url: string | null;
}

export interface CheckoutSession {
  url: string;
}

export const billingService = {
  getSubscription: (): Promise<ApiResult<Subscription>> =>
    controlApi.get<Subscription>("/billing/subscription"),

  createCheckoutSession: (plan?: string): Promise<ApiResult<CheckoutSession>> =>
    controlApi.post<CheckoutSession>("/billing/checkout-session", plan ? { plan } : undefined),
};
