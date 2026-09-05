import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { BillingService } from "./billing.service";
import type {
  ListPlansQuery,
  CreatePlanInput,
  UpdatePlanInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesQuery,
} from "./billing.validation";

export const listPlans = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await BillingService.listPlans(_req.query as unknown as ListPlansQuery);
    sendPaginated(res, result.data, result.meta, "Billing plans retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.createPlan(req.body as CreatePlanInput);
    sendSuccess(res, data, 201, "Billing plan created successfully");
  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.updatePlan(String(req.params.id), req.body as UpdatePlanInput);
    sendSuccess(res, data, 200, "Billing plan updated successfully");
  } catch (err) {
    next(err);
  }
};

export const getSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.getSubscription(toAuthUser(req));
    sendSuccess(res, data, 200, "Subscription retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.createSubscription(toAuthUser(req), req.body as CreateSubscriptionInput);
    sendSuccess(res, data, 201, "Subscription created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.updateSubscription(
      toAuthUser(req),
      String(req.params.id),
      req.body as UpdateSubscriptionInput
    );
    sendSuccess(res, data, 200, "Subscription updated successfully");
  } catch (err) {
    next(err);
  }
};

export const listInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await BillingService.listInvoices(toAuthUser(req), req.query as unknown as ListInvoicesQuery);
    sendPaginated(res, result.data, result.meta, "Invoices retrieved successfully");
  } catch (err) {
    next(err);
  }
};

export const createInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.createInvoice(toAuthUser(req), req.body as CreateInvoiceInput);
    sendSuccess(res, data, 201, "Invoice created successfully");
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.updateInvoice(
      toAuthUser(req),
      String(req.params.id),
      req.body as UpdateInvoiceInput
    );
    sendSuccess(res, data, 200, "Invoice updated successfully");
  } catch (err) {
    next(err);
  }
};

export const getUsage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await BillingService.getUsage(toAuthUser(req));
    sendSuccess(res, data, 200, "Usage retrieved successfully");
  } catch (err) {
    next(err);
  }
};
