import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  templateQuerySchema,
  importPreviewSchema,
  exportSchema,
  listImportsQuerySchema,
  idParamSchema,
  downloadTokenParamSchema,
} from "./data-management.validation";
import * as controller from "./data-management.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/templates",
  requirePermission("data_import.read"),
  validate(templateQuerySchema, "query"),
  controller.getTemplate
);

router.post(
  "/import/preview",
  requirePermission("data_import.manage"),
  validate(importPreviewSchema),
  controller.previewImport
);

router.post(
  "/import/:id/confirm",
  requirePermission("data_import.manage"),
  validate(idParamSchema, "params"),
  controller.confirmImport
);

router.get(
  "/imports",
  requirePermission("data_import.read"),
  validate(listImportsQuerySchema, "query"),
  controller.listImports
);

router.post(
  "/export",
  requirePermission("data_export.manage"),
  validate(exportSchema),
  controller.exportData
);

router.get(
  "/export/:token/download",
  requirePermission("data_export.read"),
  validate(downloadTokenParamSchema, "params"),
  controller.downloadExport
);

router.get("/deleted", requirePermission("data_import.read"), controller.listDeleted);

router.post(
  "/deleted/branches/:id/restore",
  requirePermission("data_import.manage"),
  validate(idParamSchema, "params"),
  controller.restoreBranch
);

router.get("/backup-status", requirePermission("data_export.read"), controller.getBackupStatus);

export default router;
