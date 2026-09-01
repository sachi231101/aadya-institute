import { Router } from "express";
import { AdmissionsController } from "./admissions.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(authMiddleware);

// ─── ENQUIRIES ROUTES ────────────────────────────────────────────────────────
router.get(
  "/enquiries",
  requirePermission("admission.read"),
  AdmissionsController.getEnquiries
);

router.get(
  "/enquiries/:id",
  requirePermission("admission.read"),
  AdmissionsController.getEnquiryById
);

router.post(
  "/enquiries",
  requirePermission("admission.create"),
  AdmissionsController.createEnquiry
);

router.patch(
  "/enquiries/:id",
  requirePermission("admission.update"),
  AdmissionsController.updateEnquiry
);

router.post(
  "/enquiries/:id/ai-call",
  requirePermission("admission.update"),
  AdmissionsController.triggerEnquiryAiCall
);

router.delete(
  "/enquiries/:id",
  requireRole("ADMIN", "CENTER_MANAGER"),
  AdmissionsController.deleteEnquiry
);

router.post(
  "/enquiries/:id/convert",
  requirePermission("admission.create"),
  AdmissionsController.convertEnquiryToApplication
);

router.post(
  "/enquiries/:id/create-application",
  requirePermission("admission.create"),
  AdmissionsController.convertEnquiryToApplication
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
  requireRole("ADMIN", "CENTER_MANAGER"),
  AdmissionsController.deleteApplication
);

router.post(
  "/applications/:id/convert",
  requirePermission("admission.create"),
  AdmissionsController.convertApplicationToAdmission
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
