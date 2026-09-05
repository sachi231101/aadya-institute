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
  previewNumberingSeries,
} from "./master.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission, requireAnyPermission } from "../../middlewares/permission.middleware";

const router = Router();

// All master routes require authentication
router.use(authMiddleware);

// Get counts for all entity types (for overview grid) — must be before /:entityType
router.get(
  "/counts",
  requirePermission("master.read"),
  getEntityCounts
);

// Preview next sequential number for numbering series — must be before /:entityType
router.get(
  "/numbering-series/preview",
  previewNumberingSeries
);

// Active dropdown data: assignment faculty need academicyear/assignmenttype without full master admin
router.get(
  "/:entityType/active",
  requireAnyPermission("master.read", "assignment.read", "assignment.create"),
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
