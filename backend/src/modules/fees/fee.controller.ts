import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { FeeService } from "./fee.service";
import { sendSuccess, sendError } from "../../utils/response";
import {
  queryPaymentsSchema,
  createPaymentSchema,
  queryPendingFeesSchema,
  collectPendingFeeSchema,
} from "./fee.validation";

export const getPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const validated = queryPaymentsSchema.parse(req.query);
    const result = await FeeService.getPayments(instituteId, validated);
    sendSuccess(res, result, 200, "Payments retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch payments", 400);
  }
};

export const createPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const branchId = req.user?.branchId;
    const userId = req.user?.userId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const validated = createPaymentSchema.parse(req.body);
    const payment = await FeeService.createPayment(instituteId, branchId, validated, userId);
    sendSuccess(res, payment, 201, "Payment recorded successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to record payment", 400);
  }
};

export const deletePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const id = req.params.id as string;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    await FeeService.deletePayment(id, instituteId);
    sendSuccess(res, null, 200, "Payment deleted successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to delete payment", 400);
  }
};

export const getPendingFees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const validated = queryPendingFeesSchema.parse(req.query);
    const result = await FeeService.getPendingFees(instituteId, validated);
    sendSuccess(res, result, 200, "Pending fees retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch pending fees", 400);
  }
};

export const collectPendingFee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const userId = req.user?.userId;
    const id = req.params.id as string;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const validated = collectPendingFeeSchema.parse(req.body);
    const result = await FeeService.collectPendingFee(id, instituteId, validated, userId);
    sendSuccess(res, result, 200, "Pending fee collected successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to collect pending fee", 400);
  }
};

export const sendFeeReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    const id = req.params.id as string;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const result = await FeeService.sendFeeReminder(id, instituteId);
    sendSuccess(res, result, 200, "WhatsApp fee reminder sent successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to send fee reminder", 400);
  }
};

export const getFeeStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const stats = await FeeService.getFeeStats(instituteId);
    sendSuccess(res, stats, 200, "Fee stats retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch fee stats", 400);
  }
};

export const getFeeReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const reports = await FeeService.getFeeReports(instituteId);
    sendSuccess(res, reports, 200, "Fee financial reports retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch fee reports", 400);
  }
};
