import { Router } from "express";
import { AdmissionsController } from "./admissions.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

router.use(authMiddleware);

// ─── ENQUIRIES ROUTES ────────────────────────────────────────────────────────
router.get(
  "/enquiries",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getEnquiries
);

router.get(
  "/enquiries/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getEnquiryById
);

router.post(
  "/enquiries",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.createEnquiry
);

router.patch(
  "/enquiries/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.updateEnquiry
);

router.delete(
  "/enquiries/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  AdmissionsController.deleteEnquiry
);

router.post(
  "/enquiries/:id/convert",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.convertEnquiryToApplication
);

// ─── APPLICATIONS ROUTES ─────────────────────────────────────────────────────
router.get(
  "/applications",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getApplications
);

router.get(
  "/applications/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getApplicationById
);

router.post(
  "/applications",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.createApplication
);

router.patch(
  "/applications/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.updateApplication
);

router.delete(
  "/applications/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  AdmissionsController.deleteApplication
);

router.post(
  "/applications/:id/convert",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.convertApplicationToAdmission
);

// ─── ADMISSIONS ROUTES ───────────────────────────────────────────────────────
router.get(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getAdmissions
);

router.get(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.getAdmissionById
);

router.post(
  "/",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.createAdmission
);

router.patch(
  "/:id",
  requireRole("ADMIN", "CENTER_MANAGER", "COUNSELLOR"),
  AdmissionsController.updateAdmission
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  AdmissionsController.deleteAdmission
);

export default router;
