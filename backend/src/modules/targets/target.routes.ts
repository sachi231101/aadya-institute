import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { TargetController } from "./target.controller";
import {
  CreateTargetPlanSchema,
  UpdateTargetPlanSchema,
  CreateTargetSchema,
  UpdateTargetSchema,
  QueryTargetsSchema,
  QueryIncentivesSchema,
  ApproveIncentiveSchema,
  RejectIncentiveSchema,
} from "./target.validation";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ─── Target Plans ────────────────────────────────────────────────────────────

router.get(
  "/plans",
  requirePermission("target.read"),
  TargetController.getTargetPlans
);

router.post(
  "/plans",
  requirePermission("target.manage"),
  validate(CreateTargetPlanSchema, "body"),
  TargetController.createTargetPlan
);

router.get(
  "/plans/:id",
  requirePermission("target.read"),
  TargetController.getTargetPlanById
);

router.patch(
  "/plans/:id",
  requirePermission("target.manage"),
  validate(UpdateTargetPlanSchema, "body"),
  TargetController.updateTargetPlan
);

router.post(
  "/plans/:id/publish",
  requirePermission("target.manage"),
  TargetController.publishTargetPlan
);

router.post(
  "/plans/:id/activate",
  requirePermission("target.manage"),
  TargetController.activateTargetPlan
);

router.post(
  "/plans/:id/lock",
  requirePermission("target.manage"),
  TargetController.lockTargetPlan
);

// ─── Counselor Self-Service Endpoints ────────────────────────────────────────

router.get(
  "/my/current",
  requirePermission("target.read"),
  TargetController.getMyCurrentTargets
);

router.get(
  "/my/history",
  requirePermission("target.read"),
  TargetController.getMyPerformanceHistory
);

// ─── Performance & Leaderboards ──────────────────────────────────────────────

router.get(
  "/performance/summary",
  requirePermission("target.read"),
  TargetController.getPerformanceSummary
);

router.get(
  "/performance/leaderboard",
  requirePermission("target.read"),
  TargetController.getLeaderboard
);

// ─── Incentives & Approvals ──────────────────────────────────────────────────

router.get(
  "/incentives",
  requirePermission("incentive.read"),
  validate(QueryIncentivesSchema, "query"),
  TargetController.getIncentives
);

router.get(
  "/incentives/:id",
  requirePermission("incentive.read"),
  TargetController.getIncentiveById
);

router.post(
  "/incentives/:id/approve",
  requirePermission("incentive.approve"),
  validate(ApproveIncentiveSchema, "body"),
  TargetController.approveIncentive
);

router.post(
  "/incentives/:id/reject",
  requirePermission("incentive.approve"),
  validate(RejectIncentiveSchema, "body"),
  TargetController.rejectIncentive
);

// ─── Targets CRUD ────────────────────────────────────────────────────────────

router.get(
  "/",
  requirePermission("target.read"),
  validate(QueryTargetsSchema, "query"),
  TargetController.getTargets
);

router.post(
  "/",
  requirePermission("target.manage"),
  validate(CreateTargetSchema, "body"),
  TargetController.createTarget
);

router.get(
  "/:id",
  requirePermission("target.read"),
  TargetController.getTargetById
);

router.patch(
  "/:id",
  requirePermission("target.manage"),
  validate(UpdateTargetSchema, "body"),
  TargetController.updateTarget
);

router.delete(
  "/:id",
  requirePermission("target.manage"),
  TargetController.deleteTarget
);

router.post(
  "/:id/recalculate",
  requirePermission("target.manage"),
  TargetController.recalculateTarget
);

export default router;
