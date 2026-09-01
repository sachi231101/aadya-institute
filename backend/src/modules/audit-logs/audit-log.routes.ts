import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { listAuditLogsQuerySchema } from "./audit-log.validation";
import { listAuditLogs } from "./audit-log.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requirePermission("audit.read"),
  validate(listAuditLogsQuerySchema, "query"),
  listAuditLogs
);

export default router;
