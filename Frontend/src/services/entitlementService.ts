// Control Plane Entitlements Service
import { controlApi } from "./controlClient";
import type { ApiResult } from "./apiClient";

export interface Entitlements {
  exports_enabled: boolean;
  backup_enabled: boolean;
  forms_enabled: boolean;
  scales_enabled: boolean;
  finance_enabled: boolean;
  transcription_minutes_per_month: number;
  max_patients: number;
  max_sessions_per_month: number;
  subscription_status: string;
  is_in_grace: boolean;
  grace_until: string | null;
}

export const entitlementService = {
  get: (): Promise<ApiResult<Entitlements>> =>
    controlApi.get<Entitlements>("/entitlements"),
};
