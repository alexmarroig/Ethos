export interface BioHubSubscriptionStatus {
  product: "biohub";
  status: "active" | "trialing" | "past_due" | "canceled" | "none";
  planCode: string | null;
  currentPeriodEndsAt: string | null;
}

export const BIOHUB_SUBSCRIPTION_STATUS_ENDPOINT =
  "/api/internal/biohub/subscription?email=user@example.com";

export const BIOHUB_INTERNAL_AUTH_HEADER = "Authorization: Bearer <INTERNAL_API_SECRET>";

export const BIOHUB_SUBSCRIPTION_SOURCE_OF_TRUTH =
  "BioHub subscriptions table, updated by BioHub Mercado Pago checkout/webhook";
