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

type ControlPlaneResponse<T> = {
  request_id: string;
  data: T;
  error?: { code: string; message: string };
};

const request = async <T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ControlPlaneResponse<T>;
  if (!response.ok) {
    const message = payload?.error?.message ?? "Erro ao consultar control plane";
    throw new Error(message);
  }
  return payload.data;
};

export const loginControlPlane = async (baseUrl: string, email: string, password: string) => {
  return request<{ user: { id: string; email: string; role: "admin" | "user" }; token: string }>(
    baseUrl,
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
};

export const fetchAdminOverview = async (baseUrl: string, token: string) => {
  return request<AdminOverviewMetrics>(baseUrl, "/v1/admin/metrics/overview", {
    headers: { authorization: `Bearer ${token}` },
  });
};

export const fetchAdminUsers = async (baseUrl: string, token: string) => {
  return request<AdminUser[]>(baseUrl, "/v1/admin/users", {
    headers: { authorization: `Bearer ${token}` },
  });
};
