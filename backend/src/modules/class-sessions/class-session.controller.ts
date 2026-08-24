import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/database";
import { classSessionService } from "./class-session.service";
import { sendSuccess, sendError } from "../../utils/response";

export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const branchId = req.user!.branchId || (req.query.branchId as string) || undefined;
    const roles = req.user?.roles || [];
    const isPureFaculty = roles.includes("FACULTY") &&
      !roles.includes("ADMIN") &&
      !roles.includes("CENTER_MANAGER") &&
      !roles.includes("COUNSELLOR");

    const isPureStudent = roles.includes("STUDENT") &&
      !roles.includes("ADMIN") &&
      !roles.includes("CENTER_MANAGER") &&
      !roles.includes("COUNSELLOR") &&
      !roles.includes("FACULTY");

    let facultyFilter = req.query.facultyId as string;
    let batchFilter = req.query.batchId as string;

    if (isPureFaculty) {
      const facultyRecord = await prisma.faculty.findFirst({
        where: { userId: req.user!.userId },
      });
      if (!facultyRecord) {
        sendSuccess(res, [], 200, "Class sessions retrieved successfully");
        return;
      }
      facultyFilter = facultyRecord.id;
    }

    if (isPureStudent) {
      const studentRecord = await prisma.student.findFirst({
        where: { userId: req.user!.userId },
        include: {
          enrollments: { where: { status: "ACTIVE" } },
          admissions: { where: { status: { in: ["ACTIVE", "CONFIRMED", "PROVISIONAL"] } } },
        },
      });
      if (studentRecord) {
        const studentBatchIds = [
          ...studentRecord.enrollments.map((e) => e.batchId),
          ...(studentRecord.admissions.map((a) => a.batchId).filter(Boolean) as string[]),
        ];
        if (studentBatchIds.length > 0) {
          batchFilter = batchFilter && studentBatchIds.includes(batchFilter) ? batchFilter : studentBatchIds[0];
        }
      }
    }

    const filters = {
      batchId: batchFilter,
      facultyId: facultyFilter,
      status: req.query.status as any,
      mode: req.query.mode as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
    };
    const sessions = await classSessionService.getSessions(instituteId, branchId, filters);
    sendSuccess(res, sessions, 200, "Class sessions retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.getSessionById(req.params.id as string, instituteId);
    sendSuccess(res, session, 200, "Class session details retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.createSession(instituteId, req.body);
    sendSuccess(res, session, 201, "Class session created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.updateSession(req.params.id as string, instituteId, req.body);
    sendSuccess(res, session, 200, "Class session updated successfully");
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const session = await classSessionService.cancelSession(req.params.id as string, instituteId);
    sendSuccess(res, session, 200, "Class session cancelled successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await classSessionService.deleteSession(req.params.id as string, instituteId);
    sendSuccess(res, { id: req.params.id, deleted: true }, 200, "Class session deleted successfully");
  } catch (error) {
    next(error);
  }
};
