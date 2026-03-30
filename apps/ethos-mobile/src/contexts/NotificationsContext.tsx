import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";
import { fetchNotifications } from "../services/api/notifications";
import type { NotificationPreviewRecord } from "../services/api/types";

type NotificationsContextValue = {
  notifications: NotificationPreviewRecord[];
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPreviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "patient") {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      const nextNotifications = await fetchNotifications();
      setNotifications(nextNotifications);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    isLoading,
    refreshNotifications,
  }), [isLoading, notifications, refreshNotifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
};
