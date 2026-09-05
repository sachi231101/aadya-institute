import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "../services/billing.api";

export const useBillingPlans = (params?: { search?: string }) => {
  return useQuery({
    queryKey: ["billing", "plans", params],
    queryFn: () => billingApi.listPlans(params),
  });
};

export const useBillingSubscription = () => {
  return useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => billingApi.getSubscription(),
  });
};

export const useBillingInvoices = (params?: { status?: string }) => {
  return useQuery({
    queryKey: ["billing", "invoices", params],
    queryFn: () => billingApi.listInvoices(params),
  });
};

export const useBillingUsage = () => {
  return useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => billingApi.getUsage(),
  });
};

export const useCreateBillingPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.createInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      billingApi.updateInvoice(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });
};
