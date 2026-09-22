import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { AppError } from "../../middlewares/error.middleware";
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
import {
  getDocumentTemplate,
  saveDocumentTemplate,
  streamDocumentLogo,
  uploadDocumentLogo,
} from "../document-templates/document-template.controller";
import {
  documentTemplateParamSchema,
  upsertDocumentTemplateSchema,
} from "../document-templates/document-template.validation";

const router = Router();
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get("/document-logos/:filename", streamDocumentLogo);

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

router.post(
  "/document-templates/logo",
  requirePermission("institute.update"),
  (req, res, next) => {
    logoUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        next(new AppError("Logo must be an image under 2 MB", 400));
        return;
      }
      next();
    });
  },
  uploadDocumentLogo
);

router.get(
  "/document-templates/:type",
  requirePermission("institute.read"),
  validate(documentTemplateParamSchema, "params"),
  getDocumentTemplate
);

router.put(
  "/document-templates/:type",
  requirePermission("institute.update"),
  validate(documentTemplateParamSchema, "params"),
  validate(upsertDocumentTemplateSchema),
  saveDocumentTemplate
);

export default router;
