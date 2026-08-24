import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  branchesApi,
  type BranchListParams,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from "@/services/branches.api";

const BRANCHES_KEY = "branches";

/**
 * Fetch all branches.
 */
export const useBranches = (params?: BranchListParams) => {
  return useQuery({
    queryKey: [BRANCHES_KEY, params],
    queryFn: async () => {
      const res = await branchesApi.getBranches(params);
      if (res && Array.isArray(res.data)) {
        return {
          ...res,
          data: res.data.filter((b) => b.status !== "DELETED"),
        };
      }
      return res;
    },
  });
};

/**
 * Fetch a single branch by ID.
 */
export const useBranch = (id: string | undefined) => {
  return useQuery({
    queryKey: [BRANCHES_KEY, id],
    queryFn: () => branchesApi.getBranchById(id!),
    enabled: !!id,
  });
};

/**
 * Create a new branch.
 */
export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBranchPayload) => branchesApi.createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BRANCHES_KEY] });
    },
  });
};

/**
 * Update an existing branch.
 */
export const useUpdateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBranchPayload }) =>
      branchesApi.updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BRANCHES_KEY] });
    },
  });
};

/**
 * Delete / Soft-delete a branch.
 */
export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => branchesApi.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BRANCHES_KEY] });
    },
  });
};

/**
 * Fetch branch stats (student count, faculty count, etc.)
 */
export const useBranchStats = (id: string | undefined) => {
  return useQuery({
    queryKey: [BRANCHES_KEY, id, "stats"],
    queryFn: () => branchesApi.getBranchStats(id!),
    enabled: !!id,
  });
};
