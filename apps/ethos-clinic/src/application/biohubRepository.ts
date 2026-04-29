import { db, uid } from "../infra/database";
import type { BiohubAccessAuditLog, BiohubAccessProfile, BiohubPlanOverride, BiohubSubscription } from "../domain/types";

export interface BiohubRepository {
  getProfile(userId: string): Promise<BiohubAccessProfile | undefined>;
  listSubscriptions(userId: string): Promise<BiohubSubscription[]>;
  getActiveOverride(userId: string): Promise<BiohubPlanOverride | undefined>;
  upsertProfile(profile: BiohubAccessProfile): Promise<void>;
  createOverride(override: BiohubPlanOverride): Promise<void>;
  deactivateOverrides(userId: string): Promise<void>;
  addAudit(log: Omit<BiohubAccessAuditLog, "id" | "created_at">): Promise<void>;
}

export class MemoryBiohubRepository implements BiohubRepository {
  async getProfile(userId: string) { return db.biohubAccessProfiles.get(userId); }
  async listSubscriptions(userId: string) { return Array.from(db.biohubSubscriptions.values()).filter((s) => s.user_id === userId); }
  async getActiveOverride(userId: string) { return Array.from(db.biohubPlanOverrides.values()).find((o) => o.user_id === userId && o.active); }
  async upsertProfile(profile: BiohubAccessProfile) { db.biohubAccessProfiles.set(profile.user_id, profile); }
  async createOverride(override: BiohubPlanOverride) { db.biohubPlanOverrides.set(override.id, override); }
  async deactivateOverrides(userId: string) { for (const o of db.biohubPlanOverrides.values()) if (o.user_id === userId) o.active = false; }
  async addAudit(log: Omit<BiohubAccessAuditLog, "id" | "created_at">) {
    db.biohubAccessAuditLogs.set(uid(), { id: uid(), created_at: new Date().toISOString(), ...log });
  }
}

export const biohubRepository: BiohubRepository = new MemoryBiohubRepository();
