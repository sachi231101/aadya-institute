import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ReportService } from "./report.service";
import { sendSuccess, sendError } from "../../utils/response";
import {
  getFacultyTeachingStudentIds,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
  toAuthUser,
} from "../../utils/auth-user.util";
import {
  getBranchScopeFilter,
  resolveEffectiveBranchId,
} from "../../utils/branch-isolation.util";
import { AppError } from "../../middlewares/error.middleware";

/** Deny institute-wide reports that faculty must not access. */
const assertNotPureFacultyReport = (user: ReturnType<typeof toAuthUser>, label: string) => {
  if (isPureFaculty(user.roles)) {
    throw new AppError(`Faculty cannot access ${label}`, 403);
  }
};

export const getStudentReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    if (isPureFaculty(user.roles)) {
      const facultyId = await requireFacultyIdIfPureFaculty(user);
      const studentIds = await getFacultyTeachingStudentIds(facultyId!, instituteId);
      const data = await ReportService.getStudentReport(instituteId, { studentIds });
      sendSuccess(res, data, 200, "Student report retrieved successfully");
      return;
    }

    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getStudentReport(instituteId, { branchId, branchIds });
    sendSuccess(res, data, 200, "Student report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch student report", err.statusCode || 400);
  }
};

export const getFacultyReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    assertNotPureFacultyReport(user, "faculty reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getFacultyReport(instituteId, {
      branchId,
      branchIds,
      status: req.query.status as string | undefined,
    });
    sendSuccess(res, data, 200, "Faculty report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch faculty report", err.statusCode || 400);
  }
};

export const getCourseReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    assertNotPureFacultyReport(user, "course reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getCourseReport(instituteId, {
      branchId,
      branchIds,
      status: req.query.status as string | undefined,
      category: req.query.category as string | undefined,
    });
    sendSuccess(res, data, 200, "Course report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch course report", err.statusCode || 400);
  }
};

export const getFinancialReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    assertNotPureFacultyReport(user, "financial reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }

    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getFinancialReport(instituteId, {
      branchId,
      branchIds,
      academicYear: req.query.academicYear as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      courseId: req.query.courseId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      feeHeadMasterId: req.query.feeHeadMasterId as string | undefined,
      paymentModeMasterId: req.query.paymentModeMasterId as string | undefined,
      paymentStatus: req.query.paymentStatus as string | undefined,
      counsellorId: req.query.counsellorId as string | undefined,
      transactionType: req.query.transactionType as string | undefined,
      outstandingFilter: req.query.outstandingFilter as string | undefined,
      trendGranularity: req.query.trendGranularity as
        | "monthly"
        | "yearly"
        | "quarterly"
        | undefined,
    });
    sendSuccess(res, data, 200, "Financial report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch financial report", err.statusCode || 400);
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
    assertNotPureFacultyReport(user, "admissions reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getAdmissionsReport(instituteId, {
      branchId,
      branchIds,
      academicYear: req.query.academicYear as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      courseId: req.query.courseId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      status: req.query.status as string | undefined,
      counsellorId: req.query.counsellorId as string | undefined,
      leadSource: req.query.leadSource as string | undefined,
    });
    sendSuccess(res, data, 200, "Admissions report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch admissions report", err.statusCode || 400);
  }
};

export const getAttendanceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    assertNotPureFacultyReport(user, "attendance reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getAttendanceReport(instituteId, {
      branchId,
      branchIds,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      courseId: req.query.courseId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      facultyId: req.query.facultyId as string | undefined,
      sessionType: req.query.sessionType as string | undefined,
    });
    sendSuccess(res, data, 200, "Attendance report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch attendance report", err.statusCode || 400);
  }
};

export const getExaminationsReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = toAuthUser(req);
    assertNotPureFacultyReport(user, "examinations reports");
    const instituteId = user.instituteId;
    if (!instituteId) {
      sendError(res, "Institute ID required", 400);
      return;
    }
    const { branchId, branchIds } = getBranchScopeFilter(
      user,
      req.query.branchId as string | undefined
    );
    const data = await ReportService.getExaminationsReport(instituteId, {
      branchId,
      branchIds,
      status: req.query.status as string | undefined,
      courseId: req.query.courseId as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    sendSuccess(res, data, 200, "Examinations report retrieved successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch examinations report", err.statusCode || 400);
  }
};
