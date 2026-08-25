import { Router } from "express";
import {
  getMasters,
  getMasterById,
  createMaster,
  updateMaster,
  deleteMaster,
} from "./master.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

// All master routes require authentication
router.use(authMiddleware);

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

// Delete master record
router.delete(
  "/:entityType/:id",
  requirePermission("master.delete"),
  deleteMaster
);

export default router;
