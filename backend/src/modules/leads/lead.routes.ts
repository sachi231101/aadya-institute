import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  assignLead,
  changeLeadStage,
  markLeadLost,
  convertLead,
  createFollowUp,
  updateFollowUp,
  getLeadFollowUps,
  addActivity,
  getLeadHistory,
  getDashboardSummary,
  getCounsellorPerformance,
  getFollowUpDashboard,
  triggerLeadCall,
} from "./lead.controller";
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  changeLeadStageSchema,
  markLeadLostSchema,
  convertLeadSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
  addActivitySchema,
  queryLeadsSchema,
} from "./lead.validation";

const router = Router();

// All lead routes require authentication
router.use(authMiddleware);

// ─── Dashboard Endpoints (Must precede "/:id" routes) ────────────────────────
router.get(
  "/dashboard/summary",
  requirePermission("lead.read"),
  getDashboardSummary
);

router.get(
  "/dashboard/counsellors",
  requirePermission("lead.read"),
  getCounsellorPerformance
);

router.get(
  "/dashboard/follow-ups",
  requirePermission("lead.read"),
  getFollowUpDashboard
);

// ─── Core Lead Endpoints ─────────────────────────────────────────────────────
router.get(
  "/",
  requirePermission("lead.read"),
  validate(queryLeadsSchema, "query"),
  getLeads
);

router.post(
  "/",
  requirePermission("lead.create"),
  validate(createLeadSchema),
  createLead
);

router.get(
  "/:id",
  requirePermission("lead.read"),
  getLeadById
);

router.patch(
  "/:id",
  requirePermission("lead.update"),
  validate(updateLeadSchema),
  updateLead
);

// ─── Lead Actions ────────────────────────────────────────────────────────────
router.post(
  "/:id/assign",
  requirePermission("lead.assign"),
  validate(assignLeadSchema),
  assignLead
);

router.patch(
  "/:id/stage",
  requirePermission("lead.update"),
  validate(changeLeadStageSchema),
  changeLeadStage
);

router.patch(
  "/:id/lost",
  requirePermission("lead.update"),
  validate(markLeadLostSchema),
  markLeadLost
);

router.post(
  "/:id/convert",
  requirePermission("lead.convert"),
  validate(convertLeadSchema),
  convertLead
);

router.post(
  "/:id/ai-call",
  requirePermission("lead.update"),
  triggerLeadCall
);

// ─── Follow-ups & Activities ─────────────────────────────────────────────────
router.post(
  "/:id/follow-ups",
  requirePermission("lead.update"),
  validate(createFollowUpSchema),
  createFollowUp
);

router.patch(
  "/:id/follow-ups/:followUpId",
  requirePermission("lead.update"),
  validate(updateFollowUpSchema),
  updateFollowUp
);

router.get(
  "/:id/follow-ups",
  requirePermission("lead.read"),
  getLeadFollowUps
);

router.post(
  "/:id/activities",
  requirePermission("lead.update"),
  validate(addActivitySchema),
  addActivity
);

router.get(
  "/:id/history",
  requirePermission("lead.read"),
  getLeadHistory
);

export default router;
