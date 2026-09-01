import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
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

router.get("/plans", requirePermission("settings.read"), validate(listPlansQuerySchema, "query"), controller.listPlans);
router.post("/plans", requirePermission("settings.update"), validate(createPlanSchema), controller.createPlan);
router.patch("/plans/:id", requirePermission("settings.update"), validate(updatePlanSchema), controller.updatePlan);

router.get("/subscription", requirePermission("settings.read"), controller.getSubscription);
router.post("/subscription", requirePermission("settings.update"), validate(createSubscriptionSchema), controller.createSubscription);
router.patch("/subscription/:id", requirePermission("settings.update"), validate(updateSubscriptionSchema), controller.updateSubscription);

router.get("/invoices", requirePermission("settings.read"), validate(listInvoicesQuerySchema, "query"), controller.listInvoices);
router.post("/invoices", requirePermission("settings.update"), validate(createInvoiceSchema), controller.createInvoice);
router.patch("/invoices/:id", requirePermission("settings.update"), validate(updateInvoiceSchema), controller.updateInvoice);

export default router;
