import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feesApi } from "../services/fees.api";
import type { CreatePaymentPayload, CollectPendingFeePayload } from "../types/fee.types";

export const FEES_KEYS = {
  stats: ["fees", "stats"] as const,
  reports: ["fees", "reports"] as const,
  payments: (params?: Record<string, any>) => ["fees", "payments", params] as const,
  pendingFees: (params?: Record<string, any>) => ["fees", "pending", params] as const,
};

export const useFeeStats = () => {
  return useQuery({
    queryKey: FEES_KEYS.stats,
    queryFn: () => feesApi.getStats(),
  });
};

export const useFeeReports = () => {
  return useQuery({
    queryKey: FEES_KEYS.reports,
    queryFn: () => feesApi.getReports(),
  });
};

export const usePayments = (params?: {
  search?: string;
  method?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: FEES_KEYS.payments(params),
    queryFn: () => feesApi.getPayments(params),
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => feesApi.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const usePendingFees = (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: FEES_KEYS.pendingFees(params),
    queryFn: () => feesApi.getPendingFees(params),
  });
};

export const useCollectPendingFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CollectPendingFeePayload }) =>
      feesApi.collectPendingFee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};

export const useSendFeeReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.sendReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
    },
  });
};
