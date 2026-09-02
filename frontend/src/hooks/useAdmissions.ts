import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admissionsApi } from "../services/admissions.api";
import type { CreateAdmissionPayload } from "../types/admission.types";

export const useAdmissions = (params?: {
  search?: string;
  courseId?: string;
  status?: string;
  batchId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["admissions", params],
    queryFn: () => admissionsApi.getAdmissions(params),
  });
};

export const useAdmissionById = (id: string) => {
  return useQuery({
    queryKey: ["admissions", id],
    queryFn: () => admissionsApi.getAdmissionById(id),
    enabled: !!id,
  });
};

export const useApplications = (params?: {
  search?: string;
  feeStatus?: string;
  status?: string;
  courseId?: string;
}) => {
  return useQuery({
    queryKey: ["applications", params],
    queryFn: () => admissionsApi.getApplications(params),
  });
};

export const useApplicationById = (id: string) => {
  return useQuery({
    queryKey: ["applications", id],
    queryFn: () => admissionsApi.getApplicationById(id),
    enabled: !!id,
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: admissionsApi.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof admissionsApi.updateApplication>[1];
    }) => admissionsApi.updateApplication(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications", variables.id] });
    },
  });
};

export const useCreateAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdmissionPayload) => admissionsApi.createAdmission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["pending-fees"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
};

export const useUpdateAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAdmissionPayload> }) =>
      admissionsApi.updateAdmission(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["admissions", variables.id] });
    },
  });
};

export const useConvertApplicationToAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: Parameters<typeof admissionsApi.convertApplicationToAdmission>[1];
    }) => admissionsApi.convertApplicationToAdmission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};
