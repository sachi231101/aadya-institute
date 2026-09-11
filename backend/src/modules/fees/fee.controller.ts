import type { Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { FeeService } from "./fee.service";
import { sendSuccess, sendError } from "../../utils/response";
import {
  queryPaymentsSchema,
  createPaymentSchema,
  queryPendingFeesSchema,
  collectPendingFeeSchema,
  queryFeePlansSchema,
  createFeePlanSchema,
  updateFeePlanSchema,
  queryReceiptsSchema,
  studentFeeStatementParamsSchema,
} from "./fee.validation";
import { toAuthUser } from "../../utils/auth-user.util";
import { AppError } from "../../middlewares/error.middleware";

const handleFeeError = (err: unknown, res: Response, fallback: string): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  if (err instanceof ZodError) {
    sendError(res, err.issues[0]?.message || "Validation failed", 400);
    return;
  }
  const message = err instanceof Error ? err.message : fallback;
  sendError(res, message, 400);
};

export const getPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = queryPaymentsSchema.parse(req.query);
    const result = await FeeService.getPayments(toAuthUser(req), validated);
    sendSuccess(res, result, 200, "Payments retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch payments");
  }
};

export const createPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = createPaymentSchema.parse(req.body);
    const payment = await FeeService.createPayment(
      toAuthUser(req),
      validated,
      req.user.userId
    );
    sendSuccess(res, payment, 201, "Payment recorded successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to record payment");
  }
};

export const deletePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    await FeeService.deletePayment(toAuthUser(req), req.params.id as string);
    sendSuccess(res, null, 200, "Payment deleted successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to delete payment");
  }
};

export const getPendingFees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = queryPendingFeesSchema.parse(req.query);
    const result = await FeeService.getPendingFees(toAuthUser(req), validated);
    sendSuccess(res, result, 200, "Pending fees retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch pending fees");
  }
};

export const collectPendingFee = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = collectPendingFeeSchema.parse(req.body);
    const result = await FeeService.collectPendingFee(
      toAuthUser(req),
      req.params.id as string,
      validated,
      req.user.userId
    );
    sendSuccess(res, result, 200, "Pending fee collected successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to collect pending fee");
  }
};

export const sendFeeReminder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const result = await FeeService.sendFeeReminder(
      toAuthUser(req),
      req.params.id as string
    );
    sendSuccess(res, result, 200, "WhatsApp fee reminder sent successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to send fee reminder");
  }
};

export const getFeeStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const branchId =
      typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const stats = await FeeService.getFeeStats(toAuthUser(req), branchId);
    sendSuccess(res, stats, 200, "Fee stats retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch fee stats");
  }
};

export const getFeeReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const branchId =
      typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const reports = await FeeService.getFeeReports(toAuthUser(req), branchId);
    sendSuccess(res, reports, 200, "Fee financial reports retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch fee reports");
  }
};

export const getStudentFeeStatement = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const { studentId } = studentFeeStatementParamsSchema.parse(req.params);
    const result = await FeeService.getStudentFeeStatement(toAuthUser(req), studentId);
    sendSuccess(res, result, 200, "Student fee statement retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch student fee statement");
  }
};

export const getFeePlans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = queryFeePlansSchema.parse(req.query);
    const result = await FeeService.getFeePlans(toAuthUser(req), validated);
    sendSuccess(res, result, 200, "Fee plan templates retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch fee plans");
  }
};

export const createFeePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = createFeePlanSchema.parse(req.body);
    const plan = await FeeService.createFeePlan(toAuthUser(req), validated);
    sendSuccess(res, plan, 201, "Fee plan template created successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to create fee plan");
  }
};

export const updateFeePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = updateFeePlanSchema.parse(req.body);
    const plan = await FeeService.updateFeePlan(
      toAuthUser(req),
      req.params.id as string,
      validated
    );
    sendSuccess(res, plan, 200, "Fee plan template updated successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to update fee plan");
  }
};

export const getReceipts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const validated = queryReceiptsSchema.parse(req.query);
    const result = await FeeService.getReceipts(toAuthUser(req), validated);
    sendSuccess(res, result, 200, "Fee receipts retrieved successfully");
  } catch (err: unknown) {
    handleFeeError(err, res, "Failed to fetch receipts");
  }
};
