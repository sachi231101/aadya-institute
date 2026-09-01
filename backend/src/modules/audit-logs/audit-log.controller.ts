import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { AuditLogService } from "./audit-log.service";
import type { ListAuditLogsQuery } from "./audit-log.validation";

export const listAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await AuditLogService.list(toAuthUser(req), req.query as unknown as ListAuditLogsQuery);
    sendPaginated(res, result.data, result.meta, "Audit logs retrieved successfully");
  } catch (err) {
    next(err);
  }
};
