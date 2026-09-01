import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listEmailTemplatesQuerySchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  sendTestEmailSchema,
  listEmailLogsQuerySchema,
} from "./email.validation";
import * as controller from "./email.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/templates",
  requirePermission("email.read"),
  validate(listEmailTemplatesQuerySchema, "query"),
  controller.listTemplates
);
router.post(
  "/templates",
  requirePermission("email.manage"),
  validate(createEmailTemplateSchema),
  controller.createTemplate
);
router.get("/templates/:id", requirePermission("email.read"), controller.getTemplate);
router.patch(
  "/templates/:id",
  requirePermission("email.manage"),
  validate(updateEmailTemplateSchema),
  controller.updateTemplate
);
router.delete("/templates/:id", requirePermission("email.manage"), controller.deleteTemplate);

router.post(
  "/send-test",
  requirePermission("email.manage"),
  validate(sendTestEmailSchema),
  controller.sendTest
);

router.get(
  "/logs",
  requirePermission("email.read"),
  validate(listEmailLogsQuerySchema, "query"),
  controller.listLogs
);

export default router;
