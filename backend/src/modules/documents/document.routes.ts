import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listDocumentsQuerySchema,
  createDocumentSchema,
  updateDocumentSchema,
  verifyDocumentSchema,
  rejectDocumentSchema,
} from "./document.validation";
import * as controller from "./document.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requirePermission("document.read"),
  validate(listDocumentsQuerySchema, "query"),
  controller.listDocuments
);

router.post(
  "/",
  requirePermission("document.create"),
  validate(createDocumentSchema),
  controller.createDocument
);

router.get("/:id", requirePermission("document.read"), controller.getDocument);

router.patch(
  "/:id",
  requirePermission("document.update"),
  validate(updateDocumentSchema),
  controller.updateDocument
);

router.patch(
  "/:id/verify",
  requirePermission("document.verify"),
  validate(verifyDocumentSchema),
  controller.verifyDocument
);

router.patch(
  "/:id/reject",
  requirePermission("document.verify"),
  validate(rejectDocumentSchema),
  controller.rejectDocument
);

router.delete("/:id", requirePermission("document.delete"), controller.deleteDocument);

export default router;
