import { api, type ApiResult } from "./apiClient";

export interface BioHubAccessPayload {
  hasBiohub: boolean;
  email: string;
  profileId?: string;
  slug?: string | null;
  plan?: "free" | "professional" | "premium";
  status?: "active" | "trialing" | "past_due" | "canceled" | "none" | "pending" | "paused" | "expired";
  provider?: string;
  currentPeriodEndsAt?: string;
}

export const biohubSubscriptionService = {
  getBiohubAccess: (): Promise<ApiResult<BioHubAccessPayload>> => {
    // Calls the safe Ethos endpoint which then proxies to BioHub with the secret
    return api.get<BioHubAccessPayload>("/v1/integrations/biohub/status");
  }
};

