import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import * as controller from "./ai-calling.controller";
import {
  agentIdParamSchema,
  callLogIdParamSchema,
  createAgentSchema,
  instituteIdParamSchema,
  updateAgentSchema,
  updateInstituteConfigSchema,
  updatePlatformSettingsSchema,
  usageQuerySchema,
} from "./ai-calling.validation";

const router = Router();

router.use(authMiddleware);

// ─── Institute (JWT-scoped) ──────────────────────────────────────────────────
router.get(
  "/config",
  requirePermission("ai_call.read"),
  controller.getConfig
);
router.put(
  "/config",
  requirePermission("integration.manage"),
  validate(updateInstituteConfigSchema),
  controller.updateConfig
);

router.get(
  "/usage",
  requirePermission("ai_call.read"),
  validate(usageQuerySchema, "query"),
  controller.getUsage
);

router.get(
  "/agents",
  requirePermission("ai_call.read"),
  controller.listAgents
);

router.get(
  "/logs/:id",
  requirePermission("ai_call.read"),
  validate(callLogIdParamSchema, "params"),
  controller.getCallLog
);

// ─── Super Admin platform ────────────────────────────────────────────────────
router.get(
  "/platform",
  requireRole("SUPER_ADMIN"),
  controller.getPlatform
);
router.put(
  "/platform",
  requireRole("SUPER_ADMIN"),
  validate(updatePlatformSettingsSchema),
  controller.updatePlatform
);

router.get(
  "/platform/agents",
  requireRole("SUPER_ADMIN"),
  controller.listPlatformAgents
);
router.post(
  "/platform/agents",
  requireRole("SUPER_ADMIN"),
  validate(createAgentSchema),
  controller.createPlatformAgent
);
router.put(
  "/platform/agents/:id",
  requireRole("SUPER_ADMIN"),
  validate(agentIdParamSchema, "params"),
  validate(updateAgentSchema),
  controller.updatePlatformAgent
);
router.delete(
  "/platform/agents/:id",
  requireRole("SUPER_ADMIN"),
  validate(agentIdParamSchema, "params"),
  controller.deletePlatformAgent
);

router.get(
  "/institutes/:instituteId/config",
  requireRole("SUPER_ADMIN"),
  validate(instituteIdParamSchema, "params"),
  controller.getInstituteConfigAdmin
);
router.put(
  "/institutes/:instituteId/config",
  requireRole("SUPER_ADMIN"),
  validate(instituteIdParamSchema, "params"),
  validate(updateInstituteConfigSchema),
  controller.updateInstituteConfigAdmin
);

export default router;
