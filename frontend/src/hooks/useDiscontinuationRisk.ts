import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export const useDiscontinuationRisk = (branchId?: string) => {
  return useQuery({
    queryKey: ["discontinuation-risk", branchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      const response = await api.get("/attendance/discontinuation-risk", { params });
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });
};
