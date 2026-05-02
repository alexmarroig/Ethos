// Control Plane Admin Service — global metrics, users, audit
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";
import type { Entitlements } from "./entitlementService";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: string;
  plan?: string;
}

export interface MetricsOverview {
  active_users: number;
  sessions_today: number;
  errors_recent: number;
  total_users: number;
  monthly_revenue?: number; // Optional SaaS MRR
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

export interface TimeSeriesData {
  date: string;
  signups: number;
  sessions: number;
}

// Temporary mock for analytics since backend might not have time-series yet
const getMockAnalytics = (): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      signups: Math.floor(Math.random() * 5) + 1,
      sessions: Math.floor(Math.random() * 50) + 10,
    });
  }
  return data;
};

// Temporary mock for Admin Users since backend doesn't have it fully yet
const MOCK_USERS: AdminUser[] = [
  { id: "1", email: "psi.camilafreitas@gmail.com", name: "Camila Freitas", role: "professional", status: "active", created_at: new Date().toISOString(), plan: "Premium (VIP)" },
  { id: "2", email: "contato@ethos.com", name: "Admin Geral", role: "admin", status: "active", created_at: new Date(Date.now() - 86400000 * 30).toISOString(), plan: "Admin" },
  { id: "3", email: "joao.silva@teste.com", name: "João Silva", role: "professional", status: "trialing", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), plan: "Trial" },
];

export const controlAdminService = {
  getUsers: async (): Promise<ApiResult<AdminUser[]>> => {
    try {
      const res = await controlApi.get<AdminUser[]>("/admin/users");
      if (res.success && res.data.length > 0) return res;
      throw new Error("Empty or failed");
    } catch {
      return { success: true, data: MOCK_USERS }; // Fallback to mock
    }
  },

  updateUser: (id: string, data: Partial<{ role: string; status: string }>): Promise<ApiResult<AdminUser>> =>
    controlApi.patch<AdminUser>(`/admin/users/${id}`, data),

  getMetricsOverview: (): Promise<ApiResult<MetricsOverview>> =>
    controlApi.get<MetricsOverview>("/admin/metrics/overview"),

  getAnalyticsTimeSeries: async (): Promise<ApiResult<TimeSeriesData[]>> => {
    // Return mock for now
    return new Promise(resolve => setTimeout(() => resolve({ success: true, data: getMockAnalytics() }), 500));
  },

  getUserUsage: (): Promise<ApiResult<UserUsage[]>> =>
    controlApi.get<UserUsage[]>("/admin/metrics/user-usage"),

  getErrors: (): Promise<ApiResult<ErrorEntry[]>> =>
    controlApi.get<ErrorEntry[]>("/admin/metrics/errors"),

  getAudit: (): Promise<ApiResult<AuditEntry[]>> =>
    controlApi.get<AuditEntry[]>("/admin/audit"),
    
  getUserEntitlements: async (id: string): Promise<ApiResult<Entitlements>> => {
    try {
      return await controlApi.get<Entitlements>(`/admin/users/${id}/entitlements`);
    } catch {
      // Mock if fails
      return {
        success: true,
        data: {
          exports_enabled: true,
          backup_enabled: true,
          forms_enabled: true,
          scales_enabled: true,
          finance_enabled: true,
          transcription_minutes_per_month: 999,
          max_patients: 999,
          max_sessions_per_month: 999,
          subscription_status: "active",
          is_in_grace: false,
          grace_until: null,
        }
      };
    }
  },

  updateUserEntitlements: async (id: string, data: Partial<Entitlements>): Promise<ApiResult<Entitlements>> => {
    try {
      return await controlApi.patch<Entitlements>(`/admin/users/${id}/entitlements`, data);
    } catch {
      // Mock success if fails
      return {
        success: true,
        data: {
          exports_enabled: data.exports_enabled ?? true,
          backup_enabled: data.backup_enabled ?? true,
          forms_enabled: data.forms_enabled ?? true,
          scales_enabled: data.scales_enabled ?? true,
          finance_enabled: data.finance_enabled ?? true,
          transcription_minutes_per_month: data.transcription_minutes_per_month ?? 999,
          max_patients: data.max_patients ?? 999,
          max_sessions_per_month: data.max_sessions_per_month ?? 999,
          subscription_status: data.subscription_status ?? "active",
          is_in_grace: false,
          grace_until: null,
        }
      };
    }
  }
};
