import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  queryAssignmentSchema,
} from "./assignment.validation";
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "./assignment.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("assignment.read"), validate(queryAssignmentSchema, "query"), getAssignments);
router.get("/:id", requirePermission("assignment.read"), getAssignmentById);
router.post("/", requirePermission("assignment.create"), validate(createAssignmentSchema), createAssignment);
router.patch("/:id", requirePermission("assignment.update"), validate(updateAssignmentSchema), updateAssignment);
router.delete("/:id", requirePermission("assignment.delete"), deleteAssignment);

export default router;
