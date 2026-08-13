import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type { AuthUser } from "../auth/auth.types";
import { sendSuccess, sendPaginated, sendError } from "../../utils/response";
import * as service from "./attendance.service";
import {
  postSessionAttendanceSchema,
  patchAttendanceSchema,
  studentAttendanceQuerySchema,
} from "./attendance.validation";

const buildAuthUser = (req: AuthenticatedRequest): AuthUser => {
  const user = req.user!;
  return {
    id: user.userId,
    name: "User",
    instituteId: user.instituteId,
    branchId: user.branchId,
    roles: user.roles,
    permissions: [],
  };
};

/**
 * GET /api/v1/class-sessions/:id/attendance
 * Get session details, enrolled students, and current attendance status.
 */
export const getSessionAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = (req.params.id || req.params.sessionId) as string;
    const authUser = buildAuthUser(req);
    const data = await service.getSessionAttendance(authUser, id);
    sendSuccess(res, data, 200, "Class session attendance retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/class-sessions/:id/attendance
 * Bulk submit attendance for enrolled students in a class session.
 */
export const postSessionAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classSessionId = req.params.id as string;
    const { attendance } = postSessionAttendanceSchema.parse(req.body);
    const authUser = buildAuthUser(req);
    const data = await service.submitBulkSessionAttendance(authUser, classSessionId, attendance);
    sendSuccess(res, data, 200, "Bulk attendance submitted successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/attendance/:attendanceId
 * Update single attendance record.
 */
export const patchAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attendanceId } = req.params;
    const body = patchAttendanceSchema.parse(req.body);
    const authUser = buildAuthUser(req);
    const data = await service.updateAttendanceRecord(authUser, attendanceId as string, body);
    sendSuccess(res, data, 200, "Attendance record updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/students/:studentId/attendance
 * Get attendance history for a student.
 */
export const getStudentAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const query = studentAttendanceQuerySchema.parse(req.query);
    const authUser = buildAuthUser(req);
    const result = await service.getStudentAttendance(authUser, studentId as string, query);
    sendPaginated(res, result.data, result.meta, "Student attendance history retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/students/:studentId/attendance/summary
 * Get summary stats for a student's attendance.
 */
export const getStudentAttendanceSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const authUser = buildAuthUser(req);
    const data = await service.getStudentAttendanceSummary(authUser, studentId as string);
    sendSuccess(res, data, 200, "Student attendance summary retrieved successfully");
  } catch (err) {
    next(err);
  }
};

// ─── Legacy Handlers ─────────────────────────────────────────────────────────

export const getRoster = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authUser = buildAuthUser(req);
    const { data, meta } = await service.getRoster(authUser, req.query as any);
    sendPaginated(res, data, meta);
  } catch (err) { next(err); }
};

export const mark = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.markAttendance(req.body, req.user?.userId);
    sendSuccess(res, data, 200, "Attendance marked successfully");
  } catch (err) { next(err); }
};

export const bulkMark = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await service.bulkMarkAttendance(req.body, req.user?.userId);
    sendSuccess(res, data, 200, "Bulk attendance marked successfully");
  } catch (err) { next(err); }
};
