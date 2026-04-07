import { clinicalApiClient } from "./clinicalClient";
import type { NotificationPreviewRecord } from "./types";

export const fetchNotifications = () =>
  clinicalApiClient.request<NotificationPreviewRecord[]>("/notifications", { method: "GET" });

export const sendIntelligentNotification = async (type: string, payload: any) => {
   // This would typically register a push notification task on the server
   // Or trigger a local notification for development
   console.log(`[Notification] Triggered ${type}`, payload);
};
