import { clinicalApiClient } from "./clinicalClient";
import type { NotificationPreviewRecord } from "./types";

export const fetchNotifications = () =>
  clinicalApiClient.request<NotificationPreviewRecord[]>("/notifications", { method: "GET" });
