import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  getOrganization,
  updateOrganization,
} from "../institutes/institute.controller";
import { updateInstituteSchema } from "../institutes/institute.validation";
import {
  getSystemConfig,
  updateSystemConfig,
} from "../settings/settings.controller";
import {
  systemSettingCategoryParamSchema,
  upsertSystemSettingsSchema,
} from "../settings/settings.validation";

const router = Router();

router.use(authMiddleware);

router.get(
  "/organization",
  requirePermission("institute.read"),
  getOrganization
);

router.patch(
  "/organization",
  requirePermission("institute.update"),
  validate(updateInstituteSchema),
  updateOrganization
);

router.get(
  "/system-settings/:category",
  requirePermission("settings.read"),
  validate(systemSettingCategoryParamSchema, "params"),
  getSystemConfig
);

router.put(
  "/system-settings/:category",
  requirePermission("settings.update"),
  validate(systemSettingCategoryParamSchema, "params"),
  validate(upsertSystemSettingsSchema),
  updateSystemConfig
);

export default router;
