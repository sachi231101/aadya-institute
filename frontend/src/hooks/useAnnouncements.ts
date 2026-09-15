import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  announcementsApi,
  type AnnouncementListParams,
  type CreateAnnouncementPayload,
} from "@/services/announcements.api";

const KEY = "announcements";

export const useAnnouncements = (params?: AnnouncementListParams) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: () => announcementsApi.getAll(params),
  });

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAnnouncementPayload) => announcementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
    },
  });
};
