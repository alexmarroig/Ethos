import { neon } from "@neondatabase/serverless";
import { db, uid } from "../infra/database";
import type { BiohubAccessAuditLog, BiohubAccessProfile, BiohubPlanOverride, BiohubSubscription } from "../domain/types";

type NeonSql = ReturnType<typeof neon>;

export interface BiohubRepository {
  getProfile(userId: string): Promise<BiohubAccessProfile | undefined>;
  listSubscriptions(userId: string): Promise<BiohubSubscription[]>;
  getActiveOverride(userId: string): Promise<BiohubPlanOverride | undefined>;
  upsertProfile(profile: BiohubAccessProfile): Promise<void>;
  createOverride(override: BiohubPlanOverride): Promise<void>;
  deactivateOverrides(userId: string): Promise<void>;
  addAudit(log: Omit<BiohubAccessAuditLog, "id" | "created_at">): Promise<void>;
}

class SqlBiohubRepository implements BiohubRepository {
  constructor(private readonly sql: NeonSql) {}

  async getProfile(userId: string) {
    const rows = await this.sql`SELECT user_id, trial_started_at, trial_ends_at, status, is_ambassador, blocked_at, blocked_reason FROM biohub_access_profiles WHERE user_id=${userId} LIMIT 1` as any[];
    if (!rows[0]) return undefined;
    return { ...rows[0], is_ambassador: Boolean(rows[0].is_ambassador) } as BiohubAccessProfile;
  }

  async listSubscriptions(userId: string) {
    return await this.sql`SELECT id,user_id,source,plan_code,status,current_period_start,current_period_end FROM biohub_subscriptions WHERE user_id=${userId}` as BiohubSubscription[];
  }

  async getActiveOverride(userId: string) {
    const rows = await this.sql`SELECT id,user_id,override_plan,reason,expires_at,set_by_admin_id,active FROM biohub_plan_overrides WHERE user_id=${userId} AND active=true ORDER BY updated_at DESC LIMIT 1` as BiohubPlanOverride[];
    return rows[0];
  }

  async upsertProfile(profile: BiohubAccessProfile) {
    await this.sql`INSERT INTO biohub_access_profiles (user_id,trial_started_at,trial_ends_at,status,is_ambassador,blocked_at,blocked_reason,updated_at)
      VALUES (${profile.user_id},${profile.trial_started_at},${profile.trial_ends_at},${profile.status},${profile.is_ambassador},${profile.blocked_at ?? null},${profile.blocked_reason ?? null},NOW())
      ON CONFLICT (user_id) DO UPDATE SET trial_started_at=EXCLUDED.trial_started_at,trial_ends_at=EXCLUDED.trial_ends_at,status=EXCLUDED.status,is_ambassador=EXCLUDED.is_ambassador,blocked_at=EXCLUDED.blocked_at,blocked_reason=EXCLUDED.blocked_reason,updated_at=NOW()`;
  }

  async createOverride(override: BiohubPlanOverride) {
    await this.sql`INSERT INTO biohub_plan_overrides (id,user_id,override_plan,reason,expires_at,set_by_admin_id,active,updated_at) VALUES (${override.id},${override.user_id},${override.override_plan},${override.reason},${override.expires_at ?? null},${override.set_by_admin_id},${override.active},NOW())`;
  }

  async deactivateOverrides(userId: string) {
    await this.sql`UPDATE biohub_plan_overrides SET active=false, updated_at=NOW() WHERE user_id=${userId} AND active=true`;
  }

  async addAudit(log: Omit<BiohubAccessAuditLog, "id" | "created_at">) {
    await this.sql`INSERT INTO biohub_access_audit_logs (id,actor_user_id,target_user_id,action_type,before_json,after_json,created_at,updated_at) VALUES (${uid()},${log.actor_user_id},${log.target_user_id},${log.action_type},${JSON.stringify(log.before_json)},${JSON.stringify(log.after_json)},NOW(),NOW())`;
  }
}

export class MemoryBiohubRepository implements BiohubRepository {
  async getProfile(userId: string) { return db.biohubAccessProfiles.get(userId); }
  async listSubscriptions(userId: string) { return Array.from(db.biohubSubscriptions.values()).filter((s) => s.user_id === userId); }
  async getActiveOverride(userId: string) { return Array.from(db.biohubPlanOverrides.values()).find((o) => o.user_id === userId && o.active); }
  async upsertProfile(profile: BiohubAccessProfile) { db.biohubAccessProfiles.set(profile.user_id, profile); }
  async createOverride(override: BiohubPlanOverride) { db.biohubPlanOverrides.set(override.id, override); }
  async deactivateOverrides(userId: string) { for (const o of db.biohubPlanOverrides.values()) if (o.user_id === userId) o.active = false; }
  async addAudit(log: Omit<BiohubAccessAuditLog, "id" | "created_at">) { db.biohubAccessAuditLogs.set(uid(), { id: uid(), created_at: new Date().toISOString(), ...log }); }
}

export const createBiohubRepository = (): BiohubRepository => {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const env = process.env.NODE_ENV ?? "development";
  if (env === "production" && !hasDb) throw new Error("BIOHUB_FATAL: DATABASE_URL is required in production");
  if (hasDb) return new SqlBiohubRepository(neon(process.env.DATABASE_URL!));
  return new MemoryBiohubRepository();
};

export const biohubRepository: BiohubRepository = createBiohubRepository();
