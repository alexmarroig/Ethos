import { api, type ApiResult } from "./apiClient";

export interface AvailabilityBlock {
  id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  enabled: boolean;
  created_at: string;
}

export interface SlotRequestItem {
  id: string;
  patient_id: string;
  patient_user_id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "rejected";
  responded_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export const availabilityService = {
  list: (): Promise<ApiResult<AvailabilityBlock[]>> =>
    api.get<AvailabilityBlock[]>("/availability"),

  create: (data: Omit<AvailabilityBlock, "id" | "created_at">): Promise<ApiResult<AvailabilityBlock>> =>
    api.post<AvailabilityBlock>("/availability", data),

  update: (id: string, patch: Partial<Omit<AvailabilityBlock, "id" | "created_at">>): Promise<ApiResult<AvailabilityBlock>> =>
    api.patch<AvailabilityBlock>(`/availability/${id}`, patch),

  delete: (id: string): Promise<ApiResult<null>> =>
    api.delete<null>(`/availability/${id}`),

  listSlotRequests: (): Promise<ApiResult<SlotRequestItem[]>> =>
    api.get<SlotRequestItem[]>("/slot-requests"),

  respondSlotRequest: (id: string, approved: boolean, reason?: string): Promise<ApiResult<SlotRequestItem>> =>
    api.post<SlotRequestItem>(`/slot-requests/${id}/respond`, { approved, reason }),
};
