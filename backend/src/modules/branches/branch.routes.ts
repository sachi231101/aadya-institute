import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireBranchAccess } from "../../middlewares/branch.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listBranches,
  getBranch,
  createBranch,
  updateBranch,
  updateBranchManager,
  deleteBranch,
  getBranchStats,
} from "./branch.controller";
import {
  createBranchSchema,
  updateBranchSchema,
  updateBranchManagerSchema,
  branchListQuerySchema,
} from "./branch.validation";

const router = Router();

// All branch routes require authentication
router.use(authMiddleware);

// GET /api/v1/branches — List branches
router.get(
  "/",
  requirePermission("branch.read"),
  validate(branchListQuerySchema, "query"),
  listBranches
);

// GET /api/v1/branches/:id — Get single branch details
router.get(
  "/:id",
  requireBranchAccess("id"),
  getBranch
);

// POST /api/v1/branches — Create a new branch (Admin only)
router.post(
  "/",
  requirePermission("branch.create"),
  validate(createBranchSchema),
  createBranch
);

// PATCH /api/v1/branches/:id/manager — Assign / clear branch manager
router.patch(
  "/:id/manager",
  requirePermission("branch.update"),
  requireBranchAccess("id"),
  validate(updateBranchManagerSchema),
  updateBranchManager
);

// PATCH /api/v1/branches/:id — Update branch details (incl. ACTIVE/INACTIVE status)
router.patch(
  "/:id",
  requirePermission("branch.update"),
  requireBranchAccess("id"),
  validate(updateBranchSchema),
  updateBranch
);

// DELETE /api/v1/branches/:id — Delete branch (Admin only)
router.delete(
  "/:id",
  requirePermission("branch.delete"),
  requireBranchAccess("id"),
  deleteBranch
);

// GET /api/v1/branches/:id/stats — Branch summary dashboard metrics
router.get(
  "/:id/stats",
  requirePermission("branch.read"),
  requireBranchAccess("id"),
  getBranchStats
);

export default router;
