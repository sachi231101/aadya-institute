import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveRequestsApi } from "@/services/leave-requests.api";

export const leaveRequestKeys = {
  mine: ["leave-requests", "me"] as const,
  pending: ["leave-requests", "pending"] as const,
};

export const useMyLeaveRequests = () =>
  useQuery({
    queryKey: leaveRequestKeys.mine,
    queryFn: () => leaveRequestsApi.listMine(),
  });

export const usePendingLeaveRequests = () =>
  useQuery({
    queryKey: leaveRequestKeys.pending,
    queryFn: () => leaveRequestsApi.listPending(),
    refetchInterval: 30000,
  });

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveRequestsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveRequestKeys.mine });
    },
  });
};

export const useCancelLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveRequestsApi.cancel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveRequestKeys.mine });
    },
  });
};

export const useReviewLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reviewNote,
    }: {
      id: string;
      decision: "APPROVED" | "REJECTED";
      reviewNote?: string;
    }) => leaveRequestsApi.review(id, { decision, reviewNote }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveRequestKeys.pending });
    },
  });
};
