import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ReportService } from "./report.service";
import { sendSuccess, sendError } from "../../utils/response";
import { toAuthUser } from "../../utils/auth-user.util";
import { resolveEffectiveBranchId } from "../../utils/branch-isolation.util";

export const getStudentReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getStudentReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Student report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch student report", 400);
  }
};

export const getFacultyReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
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
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getFinancialReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Financial report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch financial report", 400);
  }
};

export const getScheduleSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    if (!user.instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getScheduleSummary(user, branchId);
    sendSuccess(res, data, 200, "Schedule summary retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch schedule summary", 400);
  }
};

export const getAdmissionsReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getAdmissionsReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Admissions report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch admissions report", 400);
  }
};

export const getAttendanceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getAttendanceReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Attendance report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch attendance report", 400);
  }
};

export const getExaminationsReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const branchId = resolveEffectiveBranchId(user, req.query.branchId as string | undefined);
    const data = await ReportService.getExaminationsReport(instituteId, branchId);
    sendSuccess(res, data, 200, "Examinations report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch examinations report", 400);
  }
};
