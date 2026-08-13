import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../services/settings.api";
import type {
  UserSettingsData,
  UpdatePersonalPayload,
  ChangePasswordPayload,
  UpdateNotificationPayload,
  UpdateSystemPayload,
} from "../services/settings.api";

export const useGetSettings = () => {
  return useQuery<UserSettingsData>({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useUpdatePersonal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePersonalPayload) => settingsApi.updatePersonal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => settingsApi.changePassword(payload),
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNotificationPayload) => settingsApi.updateNotifications(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};

export const useUpdateSystem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSystemPayload) => settingsApi.updateSystem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => settingsApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};
