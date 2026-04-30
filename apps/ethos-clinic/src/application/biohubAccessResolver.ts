import { biohubRepository } from "./biohubRepository";

export type BiohubAction = "read" | "write" | "publish" | "admin";

export type BiohubAccessResult = {
  allowed: boolean;
  mode: "full" | "read_only" | "none";
  reason:
    | "bundle"
    | "standalone"
    | "trial"
    | "ambassador"
    | "override"
    | "blocked"
    | "no_access"
    | "invalid_session"
    | "degraded";
  plan: "free" | "basic" | "premium" | "trial" | "ambassador" | "none";
  source:
    | "ethos_bundle"
    | "standalone_subscription"
    | "trial"
    | "ambassador"
    | "override"
    | "none";
  can_edit: boolean;
  can_publish: boolean;
  trial_ends_at: string | null;
  limits: Record<string, unknown>;
};

const isActive = (status?: string) => status === "active";

export class BiohubAccessResolverService {
  async resolve(input: {
    user_id: string;
    tenant_id?: string;
    action?: BiohubAction;
  }): Promise<BiohubAccessResult> {
    const profile = await biohubRepository.getProfile(input.user_id);
    const now = Date.now();

    const defaultResult: BiohubAccessResult = {
      allowed: false,
      mode: "none",
      reason: "no_access",
      plan: "none",
      source: "none",
      can_edit: false,
      can_publish: false,
      trial_ends_at: profile?.trial_ends_at ?? null,
      limits: {},
    };

    if (profile?.blocked_at || profile?.status === "blocked") {
      return { ...defaultResult, reason: "blocked" };
    }

    const rawOverride = await biohubRepository.getActiveOverride(input.user_id);
    const override =
      rawOverride &&
      (!rawOverride.expires_at || Date.parse(rawOverride.expires_at) > now)
        ? rawOverride
        : undefined;

    if (override) {
      if (override.override_plan === "none") return defaultResult;

      return {
        ...defaultResult,
        allowed: true,
        mode: "full",
        reason: "override",
        plan: override.override_plan,
        source: "override",
        can_edit: true,
        can_publish: true,
      };
    }

    if (profile?.is_ambassador) {
      return {
        ...defaultResult,
        allowed: true,
        mode: "full",
        reason: "ambassador",
        plan: "ambassador",
        source: "ambassador",
        can_edit: true,
        can_publish: true,
      };
    }

    const subscriptions = await biohubRepository.listSubscriptions(input.user_id);

    const bundle = subscriptions.find(
      (item) => item.source === "bundle" && isActive(item.status)
    );

    if (bundle) {
      return {
        ...defaultResult,
        allowed: true,
        mode: "full",
        reason: "bundle",
        plan: bundle.plan_code,
        source: "ethos_bundle",
        can_edit: true,
        can_publish: true,
      };
    }

    const standalone = subscriptions.find(
      (item) => item.source === "standalone" && isActive(item.status)
    );

    if (standalone) {
      return {
        ...defaultResult,
        allowed: true,
        mode: "full",
        reason: "standalone",
        plan: standalone.plan_code,
        source: "standalone_subscription",
        can_edit: true,
        can_publish: true,
      };
    }

    const trialValid =
      profile?.trial_ends_at && Date.parse(profile.trial_ends_at) > now;

    if (trialValid) {
      return {
        ...defaultResult,
        allowed: true,
        mode: "full",
        reason: "trial",
        plan: "trial",
        source: "trial",
        can_edit: true,
        can_publish: true,
      };
    }

    return defaultResult;
  }
}