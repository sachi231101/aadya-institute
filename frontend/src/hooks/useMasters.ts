import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mastersApi,
  type MasterListParams,
  type CreateMasterPayload,
  type UpdateMasterPayload,
} from "../services/masters.api";

const MASTERS_KEY = "masters";

export const useMasterRecords = (
  entityType: string | undefined,
  params?: MasterListParams
) => {
  return useQuery({
    queryKey: [MASTERS_KEY, entityType, params],
    queryFn: () => mastersApi.getMasters(entityType!, params),
    enabled: !!entityType,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useMasterRecordById = (
  entityType: string | undefined,
  id: string | undefined
) => {
  return useQuery({
    queryKey: [MASTERS_KEY, entityType, id],
    queryFn: () => mastersApi.getMasterById(entityType!, id!),
    enabled: !!entityType && !!id,
  });
};

export const useCreateMasterRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      payload,
    }: {
      entityType: string;
      payload: CreateMasterPayload;
    }) => mastersApi.createMaster(entityType, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MASTERS_KEY] });
    },
  });
};

export const useUpdateMasterRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      id,
      payload,
    }: {
      entityType: string;
      id: string;
      payload: UpdateMasterPayload;
    }) => mastersApi.updateMaster(entityType, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MASTERS_KEY] });
    },
  });
};

export const useDeleteMasterRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      id,
    }: {
      entityType: string;
      id: string;
    }) => mastersApi.deleteMaster(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MASTERS_KEY] });
    },
  });
};

/**
 * Fetch record counts for all entity types (for overview grid)
 */
export const useMasterEntityCounts = () => {
  return useQuery({
    queryKey: [MASTERS_KEY, "counts"],
    queryFn: () => mastersApi.getEntityCounts(),
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Fetch active-only records for a given entity type (for dropdown consumption)
 */
export const useActiveMasterRecords = (
  entityType: string | undefined,
  branchId?: string
) => {
  return useQuery({
    queryKey: [MASTERS_KEY, "active", entityType, branchId],
    queryFn: () => mastersApi.getActiveMasters(entityType!, branchId),
    enabled: !!entityType,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Toggle a master record's active/inactive status
 */
export const useToggleMasterStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      id,
    }: {
      entityType: string;
      id: string;
    }) => mastersApi.toggleMasterStatus(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MASTERS_KEY] });
    },
  });
};

/**
 * Fetch live preview of next sequential number for numbering series
 */
export const useNumberingSeriesPreview = (
  target: string,
  params?: { branchCode?: string; courseCode?: string }
) => {
  return useQuery({
    queryKey: [MASTERS_KEY, "preview", target, params?.branchCode, params?.courseCode],
    queryFn: () => mastersApi.previewNumberingSeries(target, params),
    enabled: !!target,
    staleTime: 1000 * 30, // 30s
  });
};

