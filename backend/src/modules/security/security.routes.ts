import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  getPolicy,
  getPasswordRequirements,
  updatePolicy,
  listLoginHistory,
  listSessions,
  revokeSession,
  logoutOtherSessions,
  listAllowedIps,
  addAllowedIp,
  removeAllowedIp,
  listAlerts,
  resolveAlert,
} from "./security.controller";
import {
  updateSecurityPolicySchema,
  loginHistoryQuerySchema,
  securityAlertsQuerySchema,
  createAllowedIpSchema,
  logoutOtherSessionsSchema,
  idParamSchema,
} from "./security.validation";

const router = Router();

router.use(authMiddleware);

// Policy
router.get("/policy", requirePermission("security.read"), getPolicy);
/** Safe password rules for user-creation forms (any authenticated user). */
router.get("/password-requirements", getPasswordRequirements);
router.patch(
  "/policy",
  requirePermission("security.update"),
  validate(updateSecurityPolicySchema),
  updatePolicy
);

// Login history
router.get(
  "/login-history",
  requirePermission("security.read"),
  validate(loginHistoryQuerySchema, "query"),
  listLoginHistory
);

// Sessions — authenticated users can list/revoke own; admin sees all
router.get("/sessions", listSessions);
router.delete(
  "/sessions/:id",
  validate(idParamSchema, "params"),
  revokeSession
);
router.delete(
  "/sessions",
  validate(logoutOtherSessionsSchema),
  logoutOtherSessions
);

// Allowed IPs
router.get(
  "/allowed-ips",
  requirePermission("security.read"),
  listAllowedIps
);
router.post(
  "/allowed-ips",
  requirePermission("security.update"),
  validate(createAllowedIpSchema),
  addAllowedIp
);
router.delete(
  "/allowed-ips/:id",
  requirePermission("security.update"),
  validate(idParamSchema, "params"),
  removeAllowedIp
);

// Alerts
router.get(
  "/alerts",
  requirePermission("security.read"),
  validate(securityAlertsQuerySchema, "query"),
  listAlerts
);
router.patch(
  "/alerts/:id/resolve",
  requirePermission("security.update"),
  validate(idParamSchema, "params"),
  resolveAlert
);

export default router;
