import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAnyPermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  deleteFacultyScheduleBlockByKeySchema,
  queryFacultyScheduleBlockSchema,
  upsertFacultyScheduleBlockSchema,
} from "./faculty-schedule-block.validation";
import {
  deleteBlockById,
  deleteBlockByKey,
  listBlocks,
  upsertBlock,
} from "./faculty-schedule-block.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requireAnyPermission("schedule.read", "schedule.create", "schedule.update"),
  validate(queryFacultyScheduleBlockSchema, "query"),
  listBlocks
);

router.put(
  "/",
  requireAnyPermission("schedule.create", "schedule.update"),
  validate(upsertFacultyScheduleBlockSchema),
  upsertBlock
);

/** Delete by faculty + date + startTime (query). Must be registered before /:id. */
router.delete(
  "/",
  requireAnyPermission("schedule.delete", "schedule.update"),
  validate(deleteFacultyScheduleBlockByKeySchema, "query"),
  deleteBlockByKey
);

router.delete(
  "/:id",
  requireAnyPermission("schedule.delete", "schedule.update"),
  deleteBlockById
);

export default router;
