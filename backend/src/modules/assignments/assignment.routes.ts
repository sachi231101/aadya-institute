import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  queryAssignmentSchema,
  querySubmissionsSchema,
  gradeSubmissionSchema,
  submitAssignmentSchema,
} from "./assignment.validation";
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  submitAssignment,
  listSubmissions,
  uploadSubmissionFile,
  downloadSubmissionFile,
  getAssignmentStats,
  uploadAttachment,
  downloadAttachment,
  getEnrolledStudentsForBatches,
} from "./assignment.controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get("/", requirePermission("assignment.read"), validate(queryAssignmentSchema, "query"), getAssignments);
router.get("/stats", requirePermission("assignment.read"), getAssignmentStats);
router.get(
  "/enrolled-students",
  requirePermission("assignment.read"),
  getEnrolledStudentsForBatches
);
router.get(
  "/submissions",
  requirePermission("assignment.read"),
  validate(querySubmissionsSchema, "query"),
  listSubmissions
);
router.patch(
  "/submissions/:submissionId/grade",
  requirePermission("assignment.grade"),
  validate(gradeSubmissionSchema),
  gradeSubmission
);
router.get(
  "/submissions/:submissionId/download",
  requirePermission("assignment.read"),
  downloadSubmissionFile
);
router.post(
  "/:id/upload",
  requirePermission("assignment.submit"),
  upload.single("file"),
  uploadSubmissionFile
);
router.post(
  "/:id/attachment",
  requirePermission("assignment.create"),
  upload.single("file"),
  uploadAttachment
);
router.get(
  "/:id/attachment/download",
  requirePermission("assignment.read"),
  downloadAttachment
);
router.post(
  "/:id/submissions",
  requirePermission("assignment.submit"),
  validate(submitAssignmentSchema),
  submitAssignment
);
router.get("/:id", requirePermission("assignment.read"), getAssignmentById);
router.post("/", requirePermission("assignment.create"), validate(createAssignmentSchema), createAssignment);
router.patch("/:id", requirePermission("assignment.update"), validate(updateAssignmentSchema), updateAssignment);
router.delete("/:id", requirePermission("assignment.delete"), deleteAssignment);

export default router;
