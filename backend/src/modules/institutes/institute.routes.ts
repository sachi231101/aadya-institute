import { Router } from "express";
import * as controller from "./institute.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createInstituteSchema, updateInstituteSchema } from "./institute.validation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", validate(createInstituteSchema), controller.create);
router.patch("/:id", validate(updateInstituteSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
