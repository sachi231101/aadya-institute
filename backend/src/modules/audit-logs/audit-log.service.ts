import { buildMeta } from "../../utils/pagination";
import type { AuthUser } from "../auth/auth.types";
import { AuditLogRepository } from "./audit-log.repository";
import type { ListAuditLogsQuery } from "./audit-log.validation";

export const AuditLogService = {
  async list(currentUser: AuthUser, query: ListAuditLogsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await AuditLogRepository.findMany(currentUser.instituteId, {
      userId: query.userId,
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },
};
