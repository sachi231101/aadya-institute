import { Router } from "express";
import {
  getMasters,
  getMasterById,
  createMaster,
  updateMaster,
  deleteMaster,
  toggleMasterStatus,
  getEntityCounts,
  getActiveMasters,
} from "./master.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

// All master routes require authentication
router.use(authMiddleware);

// Get counts for all entity types (for overview grid) — must be before /:entityType
router.get(
  "/counts",
  requirePermission("master.read"),
  getEntityCounts
);

// Get active-only records for dropdown consumption — must be before /:entityType/:id
router.get(
  "/:entityType/active",
  requirePermission("master.read"),
  getActiveMasters
);

// Get list of master records by entityType
router.get(
  "/:entityType",
  requirePermission("master.read"),
  getMasters
);

// Get single master record
router.get(
  "/:entityType/:id",
  requirePermission("master.read"),
  getMasterById
);

// Create new master record
router.post(
  "/:entityType",
  requirePermission("master.create"),
  createMaster
);

// Update master record
router.patch(
  "/:entityType/:id",
  requirePermission("master.update"),
  updateMaster
);

// Toggle master record status (active/inactive)
router.patch(
  "/:entityType/:id/toggle-status",
  requirePermission("master.update"),
  toggleMasterStatus
);

// Delete (soft delete) master record
router.delete(
  "/:entityType/:id",
  requirePermission("master.delete"),
  deleteMaster
);

export default router;
