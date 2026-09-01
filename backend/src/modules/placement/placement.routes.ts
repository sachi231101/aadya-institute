import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listCompaniesQuerySchema,
  createCompanySchema,
  updateCompanySchema,
  listJobsQuerySchema,
  createJobSchema,
  updateJobSchema,
  listApplicationsQuerySchema,
  createApplicationSchema,
  updateApplicationSchema,
  listInterviewsQuerySchema,
  createInterviewSchema,
  updateInterviewSchema,
  listPlacementsQuerySchema,
  createPlacementSchema,
  updatePlacementSchema,
  eligibleStudentsQuerySchema,
} from "./placement.validation";
import * as controller from "./placement.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/eligible-students",
  requirePermission("placement.read"),
  validate(eligibleStudentsQuerySchema, "query"),
  controller.getEligibleStudents
);

router.get(
  "/companies",
  requirePermission("placement.read"),
  validate(listCompaniesQuerySchema, "query"),
  controller.listCompanies
);
router.post(
  "/companies",
  requirePermission("placement.create"),
  validate(createCompanySchema),
  controller.createCompany
);
router.get("/companies/:id", requirePermission("placement.read"), controller.getCompany);
router.patch(
  "/companies/:id",
  requirePermission("placement.update"),
  validate(updateCompanySchema),
  controller.updateCompany
);
router.delete("/companies/:id", requirePermission("placement.delete"), controller.deleteCompany);

router.get(
  "/jobs",
  requirePermission("placement.read"),
  validate(listJobsQuerySchema, "query"),
  controller.listJobs
);
router.post("/jobs", requirePermission("placement.create"), validate(createJobSchema), controller.createJob);
router.get("/jobs/:id", requirePermission("placement.read"), controller.getJob);
router.patch(
  "/jobs/:id",
  requirePermission("placement.update"),
  validate(updateJobSchema),
  controller.updateJob
);
router.delete("/jobs/:id", requirePermission("placement.delete"), controller.deleteJob);

router.get(
  "/applications",
  requirePermission("placement.read"),
  validate(listApplicationsQuerySchema, "query"),
  controller.listApplications
);
router.post(
  "/applications",
  requirePermission("placement.create"),
  validate(createApplicationSchema),
  controller.createApplication
);
router.get("/applications/:id", requirePermission("placement.read"), controller.getApplication);
router.patch(
  "/applications/:id",
  requirePermission("placement.update"),
  validate(updateApplicationSchema),
  controller.updateApplication
);
router.delete("/applications/:id", requirePermission("placement.delete"), controller.deleteApplication);

router.get(
  "/interviews",
  requirePermission("placement.read"),
  validate(listInterviewsQuerySchema, "query"),
  controller.listInterviews
);
router.post(
  "/interviews",
  requirePermission("placement.create"),
  validate(createInterviewSchema),
  controller.createInterview
);
router.get("/interviews/:id", requirePermission("placement.read"), controller.getInterview);
router.patch(
  "/interviews/:id",
  requirePermission("placement.update"),
  validate(updateInterviewSchema),
  controller.updateInterview
);
router.delete("/interviews/:id", requirePermission("placement.delete"), controller.deleteInterview);

router.get(
  "/placements",
  requirePermission("placement.read"),
  validate(listPlacementsQuerySchema, "query"),
  controller.listPlacements
);
router.post(
  "/placements",
  requirePermission("placement.create"),
  validate(createPlacementSchema),
  controller.createPlacement
);
router.get("/placements/:id", requirePermission("placement.read"), controller.getPlacement);
router.patch(
  "/placements/:id",
  requirePermission("placement.update"),
  validate(updatePlacementSchema),
  controller.updatePlacement
);
router.delete("/placements/:id", requirePermission("placement.delete"), controller.deletePlacement);

export default router;
