import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recordingsApi, type RecordingQueryParams } from "../services/recordings.api";

export const useRecordings = (
  params?: RecordingQueryParams & { enabled?: boolean }
) => {
  const { enabled = true, ...queryParams } = params || {};
  return useQuery({
    queryKey: ["recordings", queryParams],
    queryFn: () => recordingsApi.getRecordings(queryParams),
    enabled,
    // Refresh status when faculty returns to the tab (PENDING → PROCESSING → AVAILABLE)
    refetchOnWindowFocus: true,
  });
};

export const useRecordingById = (id: string) => {
  return useQuery({
    queryKey: ["recordings", id],
    queryFn: () => recordingsApi.getRecordingById(id),
    enabled: !!id,
  });
};

export const useCreateRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.createRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
};

export const useDeleteRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.deleteRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
};

export const useSyncRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.syncRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
};

export const useExpireRecording = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordingsApi.expireRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
};

export const useRecordingAccess = () => {
  return useMutation({
    mutationFn: recordingsApi.getRecordingAccess,
  });
};
