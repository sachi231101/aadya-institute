import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  disconnectIntegration,
  getIntegration,
  listIntegrations,
  testIntegration,
  upsertIntegration,
} from "./integration.controller";
import { integrationTypeParamSchema } from "./integration.validation";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("integration.read"), listIntegrations);

router.get(
  "/:type",
  requirePermission("integration.read"),
  validate(integrationTypeParamSchema, "params"),
  getIntegration
);

router.put(
  "/:type",
  requirePermission("integration.manage"),
  validate(integrationTypeParamSchema, "params"),
  upsertIntegration
);

router.post(
  "/:type/test",
  requirePermission("integration.manage"),
  validate(integrationTypeParamSchema, "params"),
  testIntegration
);

router.post(
  "/:type/disconnect",
  requirePermission("integration.manage"),
  validate(integrationTypeParamSchema, "params"),
  disconnectIntegration
);

export default router;
