import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createRecordingSchema, queryRecordingSchema } from "./recording.validation";
import { getRecordings, getRecordingById, createRecording, deleteRecording } from "./recording.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("recording.read"), validate(queryRecordingSchema, "query"), getRecordings);
router.get("/:id", requirePermission("recording.read"), getRecordingById);
router.post("/", requirePermission("recording.create"), validate(createRecordingSchema), createRecording);
router.delete("/:id", requirePermission("recording.delete"), deleteRecording);

export default router;
