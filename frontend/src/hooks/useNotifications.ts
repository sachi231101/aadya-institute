import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { notificationsApi } from "../services/notifications.api";
import type {
  NotificationFilters,
  NotificationListResponse,
  UnreadCountResponse,
} from "../services/notifications.api";

/** Pause polling when the browser tab is hidden to cut background API chatter. */
const useDocumentVisible = () => {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
};

export const useGetNotifications = (filters: NotificationFilters = {}) => {
  const visible = useDocumentVisible();
  return useQuery<NotificationListResponse>({
    queryKey: ["notifications", filters],
    queryFn: () => notificationsApi.getNotifications(filters),
    refetchInterval: visible ? 1000 * 60 : false,
  });
};

export const useGetUnreadCount = () => {
  const visible = useDocumentVisible();
  return useQuery<UnreadCountResponse>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: visible ? 1000 * 45 : false,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
