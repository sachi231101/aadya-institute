import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recordingsApi, type RecordingQueryParams } from "../services/recordings.api";

export const useRecordings = (params?: RecordingQueryParams) => {
  return useQuery({
    queryKey: ["recordings", params],
    queryFn: () => recordingsApi.getRecordings(params),
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

export const useRecordingAccess = () => {
  return useMutation({
    mutationFn: recordingsApi.getRecordingAccess,
  });
};
