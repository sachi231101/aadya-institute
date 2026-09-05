import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  getSettings,
  updatePersonal,
  changePassword,
  updateNotifications,
  updateSystem,
  revokeSession,
  getSystemConfig,
  updateSystemConfig,
} from "./settings.controller";
import {
  updatePersonalSchema,
  changePasswordSchema,
  updateNotificationsSchema,
  updateSystemPreferencesSchema,
  upsertSystemSettingsSchema,
  systemSettingCategoryParamSchema,
} from "./settings.validation";

const router = Router();

router.use(authMiddleware);

router.get("/me", getSettings);
router.put("/personal", validate(updatePersonalSchema), updatePersonal);
router.put("/security/password", validate(changePasswordSchema), changePassword);
router.put("/notifications", validate(updateNotificationsSchema), updateNotifications);
router.put("/system", validate(updateSystemPreferencesSchema), updateSystem);
router.delete("/security/sessions/:id", revokeSession);

router.get(
  "/system-config/:category",
  requirePermission("settings.read"),
  validate(systemSettingCategoryParamSchema, "params"),
  getSystemConfig
);
router.put(
  "/system-config/:category",
  requirePermission("settings.update"),
  validate(systemSettingCategoryParamSchema, "params"),
  validate(upsertSystemSettingsSchema),
  updateSystemConfig
);

export default router;
