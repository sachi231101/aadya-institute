import { Router } from "express";
import * as controller from "./institute.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createInstituteSchema, updateInstituteSchema } from "./institute.validation";

const router = Router();

router.use(authMiddleware);

router.get("/", requireRole("ADMIN", "SUPER_ADMIN"), controller.getAll);
router.get("/:id", requireRole("ADMIN", "SUPER_ADMIN"), controller.getById);
router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  validate(createInstituteSchema),
  controller.create
);
router.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate(updateInstituteSchema),
  controller.update
);
router.delete("/:id", requireRole("SUPER_ADMIN"), controller.remove);

export default router;
