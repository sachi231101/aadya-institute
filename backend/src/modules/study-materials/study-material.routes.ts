import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermissionUnlessRoles } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createStudyMaterialSchema,
  listStudyMaterialsQuerySchema,
} from "./study-material.validation";
import * as controller from "./study-material.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requirePermissionUnlessRoles("document.read", "FACULTY", "ADMIN"),
  validate(listStudyMaterialsQuerySchema, "query"),
  controller.listStudyMaterials
);

router.post(
  "/",
  requirePermissionUnlessRoles("document.create", "FACULTY", "ADMIN"),
  validate(createStudyMaterialSchema),
  controller.createStudyMaterial
);

router.delete(
  "/:id",
  requirePermissionUnlessRoles("document.create", "FACULTY", "ADMIN"),
  controller.deleteStudyMaterial
);

export default router;
