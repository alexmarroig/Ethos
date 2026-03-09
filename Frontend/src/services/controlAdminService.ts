// Control Plane Admin Service — global metrics, users, audit
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
}

export interface MetricsOverview {
  active_users: number;
  sessions_today: number;
  errors_recent: number;
  total_users: number;
}

export interface UserUsage {
  user_id: string;
  email: string;
  sessions_count: number;
  last_active: string;
}

export interface ErrorEntry {
  code: string;
  count: number;
  last_seen: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export const controlAdminService = {
  getUsers: (): Promise<ApiResult<AdminUser[]>> =>
    controlApi.get<AdminUser[]>("/admin/users"),

  updateUser: (id: string, data: Partial<{ role: string; status: string }>): Promise<ApiResult<AdminUser>> =>
    controlApi.patch<AdminUser>(`/admin/users/${id}`, data),

  getMetricsOverview: (): Promise<ApiResult<MetricsOverview>> =>
    controlApi.get<MetricsOverview>("/admin/metrics/overview"),

  getUserUsage: (): Promise<ApiResult<UserUsage[]>> =>
    controlApi.get<UserUsage[]>("/admin/metrics/user-usage"),

  getErrors: (): Promise<ApiResult<ErrorEntry[]>> =>
    controlApi.get<ErrorEntry[]>("/admin/metrics/errors"),

  getAudit: (): Promise<ApiResult<AuditEntry[]>> =>
    controlApi.get<AuditEntry[]>("/admin/audit"),
};
