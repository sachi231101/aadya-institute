import { useQuery } from "@tanstack/react-query";
import { auditLogsApi, type AuditLogQueryParams } from "../services/audit-logs.api";

export const useAuditLogs = (params?: AuditLogQueryParams) => {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => auditLogsApi.list(params),
    staleTime: 1000 * 60 * 2,
  });
};
