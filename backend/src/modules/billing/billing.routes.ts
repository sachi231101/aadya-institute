import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  listPlansQuerySchema,
  createPlanSchema,
  updatePlanSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
} from "./billing.validation";
import * as controller from "./billing.controller";

const router = Router();

router.use(authMiddleware);

router.get(
  "/plans",
  requirePermission("subscription.read"),
  validate(listPlansQuerySchema, "query"),
  controller.listPlans
);
router.post(
  "/plans",
  requireRole("SUPER_ADMIN"),
  validate(createPlanSchema),
  controller.createPlan
);
router.patch(
  "/plans/:id",
  requireRole("SUPER_ADMIN"),
  validate(updatePlanSchema),
  controller.updatePlan
);

router.get("/subscription", requirePermission("subscription.read"), controller.getSubscription);
router.get("/usage", requirePermission("subscription.read"), controller.getUsage);
router.post(
  "/subscription",
  requirePermission("subscription.update"),
  validate(createSubscriptionSchema),
  controller.createSubscription
);
router.patch(
  "/subscription/:id",
  requirePermission("subscription.update"),
  validate(updateSubscriptionSchema),
  controller.updateSubscription
);

router.get(
  "/invoices",
  requirePermission("subscription.read"),
  validate(listInvoicesQuerySchema, "query"),
  controller.listInvoices
);
router.post(
  "/invoices",
  requirePermission("subscription.update"),
  validate(createInvoiceSchema),
  controller.createInvoice
);
router.patch(
  "/invoices/:id",
  requirePermission("subscription.update"),
  validate(updateInvoiceSchema),
  controller.updateInvoice
);

export default router;
