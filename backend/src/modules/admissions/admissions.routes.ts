import { Router } from "express";
import { AdmissionsController } from "./admissions.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import {
  requirePermission,
  requireAnyPermission,
} from "../../middlewares/permission.middleware";

const router = Router();

router.use(authMiddleware);

// Staff picker for "Admission taken by" (must be before "/:id")
router.get(
  "/staff-options",
  requireAnyPermission("admission.create", "admission.read"),
  AdmissionsController.getStaffOptions
);

// ─── APPLICATIONS ROUTES ─────────────────────────────────────────────────────
router.get(
  "/applications",
  requirePermission("admission.read"),
  AdmissionsController.getApplications
);

router.get(
  "/applications/:id",
  requirePermission("admission.read"),
  AdmissionsController.getApplicationById
);

router.post(
  "/applications",
  requirePermission("admission.create"),
  AdmissionsController.createApplication
);

router.patch(
  "/applications/:id",
  requirePermission("admission.update"),
  AdmissionsController.updateApplication
);

router.delete(
  "/applications/:id",
  requirePermission("admission.update"),
  AdmissionsController.deleteApplication
);

router.get(
  "/applications/:id/activities",
  requirePermission("admission.read"),
  AdmissionsController.getApplicationActivities
);

router.post(
  "/applications/:id/activities",
  requirePermission("admission.update"),
  AdmissionsController.createApplicationActivity
);

// ─── ADMISSIONS ROUTES ───────────────────────────────────────────────────────
router.get(
  "/",
  requirePermission("admission.read"),
  AdmissionsController.getAdmissions
);

router.get(
  "/:id",
  requirePermission("admission.read"),
  AdmissionsController.getAdmissionById
);

router.post(
  "/",
  requirePermission("admission.create"),
  AdmissionsController.createAdmission
);

router.patch(
  "/:id",
  requirePermission("admission.update"),
  AdmissionsController.updateAdmission
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  AdmissionsController.deleteAdmission
);

export default router;
