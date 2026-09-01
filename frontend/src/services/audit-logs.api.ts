import { api } from "./api";

export interface AuditLog {
  id: string;
  instituteId: string;
  branchId?: string;
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { id: string; name: string; email?: string };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  action?: string;
  userId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditLogsApi = {
  list: async (params?: AuditLogQueryParams) => {
    const response = await api.get("/audit-logs", { params });
    return response.data;
  },
};
