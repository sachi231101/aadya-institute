import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ReportService } from "./report.service";
import { sendSuccess, sendError } from "../../utils/response";

export const getStudentReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = (req.query.branchId as string) || req.user?.branchId || undefined;
    const data = await ReportService.getStudentReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Student report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch student report", 400);
  }
};

export const getFacultyReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = (req.query.branchId as string) || req.user?.branchId || undefined;
    const data = await ReportService.getFacultyReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Faculty report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch faculty report", 400);
  }
};

export const getCourseReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const data = await ReportService.getCourseReport(instituteId);
    sendSuccess(res, data, 200, "Course report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch course report", 400);
  }
};

export const getFinancialReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const instituteId = req.user?.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = (req.query.branchId as string) || req.user?.branchId || undefined;
    const data = await ReportService.getFinancialReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Financial report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch financial report", 400);
  }
};
