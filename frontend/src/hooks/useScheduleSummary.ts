import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../services/reports.api";

export const useScheduleSummary = (branchId?: string) => {
  return useQuery({
    queryKey: ["schedule-summary", branchId],
    queryFn: () => reportsApi.getScheduleSummary(branchId),
  });
};
