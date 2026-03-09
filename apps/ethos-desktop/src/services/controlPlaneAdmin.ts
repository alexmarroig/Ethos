import { controlClient } from "./api/clients";

export type AdminOverviewMetrics = {
  users_total: number;
  telemetry_total: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "disabled";
};

export type RequestExtras = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type LoginResponse = {
  user: { id: string; email: string; role: "admin" | "user" };
  token: string;
};

export const loginControlPlane = async (
  _baseUrl: string,
  credentials: { email: string; password: string },
  extras?: RequestExtras,
) => {
  const result = await controlClient.request<LoginResponse>("/v1/auth/login", {
    method: "POST",
    body: credentials,
    signal: extras?.signal,
    timeoutMs: extras?.timeoutMs,
  });

  return {
    token: result.token,
    role: result.user.role,
    user: result.user,
  };
};

export const fetchAdminOverview = async (_baseUrl: string, _token: string, extras?: RequestExtras) => {
  return controlClient.request<AdminOverviewMetrics>("/v1/admin/metrics/overview", {
    signal: extras?.signal,
    timeoutMs: extras?.timeoutMs,
  });
};

export const fetchAdminUsers = async (_baseUrl: string, _token: string, extras?: RequestExtras) => {
  return controlClient.request<AdminUser[]>("/v1/admin/users", {
    signal: extras?.signal,
    timeoutMs: extras?.timeoutMs,
  });
};
