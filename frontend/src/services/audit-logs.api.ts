import { api } from "./api";

export interface AuditLog {
  id: string;
  instituteId: string;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email?: string };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  action?: string;
  userId?: string;
  branchId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditLogsApi = {
  list: async (params?: AuditLogQueryParams) => {
    const response = await api.get("/audit-logs", { params });
    return response.data;
  },
};
