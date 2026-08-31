import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/database";
import { classSessionService } from "./class-session.service";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { assertFacultyOwnsSession, toAuthUser } from "../../utils/auth-user.util";
import type { QueryClassSessionsDto } from "./class-session.types";

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
    let batchIds: string[] | undefined;

    if (isPureFaculty) {
      const facultyRecord = await prisma.faculty.findFirst({
        where: { userId: req.user!.userId },
      });
      if (!facultyRecord) {
        sendPaginated(res, [], { total: 0, page: 1, limit: 20, totalPages: 0 }, "Class sessions retrieved successfully");
        return;
      }
      facultyFilter = facultyRecord.id;
    }

    if (isPureStudent) {
      const studentRecord = await prisma.student.findFirst({
        where: { userId: req.user!.userId },
        include: {
          batchEnrollments: { where: { status: "ACTIVE" as any } },
        },
      });
      if (!studentRecord) {
        sendPaginated(res, [], { total: 0, page: 1, limit: 20, totalPages: 0 }, "Class sessions retrieved successfully");
        return;
      }
      const studentBatchIds = (studentRecord.batchEnrollments || [])
        .map((e: any) => e.batchId)
        .filter(Boolean);
      if (studentBatchIds.length === 0) {
        sendPaginated(res, [], { total: 0, page: 1, limit: 20, totalPages: 0 }, "Class sessions retrieved successfully");
        return;
      }
      if (batchFilter && studentBatchIds.includes(batchFilter)) {
        // keep single batch filter
      } else {
        batchIds = studentBatchIds;
        batchFilter = "";
      }
    }

    const filters: QueryClassSessionsDto = {
      batchId: batchFilter || undefined,
      batchIds,
      facultyId: facultyFilter,
      status: req.query.status as QueryClassSessionsDto["status"],
      mode: req.query.mode as QueryClassSessionsDto["mode"],
      sessionType: req.query.sessionType as QueryClassSessionsDto["sessionType"],
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const result = await classSessionService.getSessions(instituteId, branchId, filters);
    sendPaginated(res, result.data, result.meta, "Class sessions retrieved successfully");
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
    await assertFacultyOwnsSession(toAuthUser(req), req.params.id as string);
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

export const startLiveSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await assertFacultyOwnsSession(toAuthUser(req), req.params.id as string);
    const meetingUrl = req.body?.meetingUrl as string | undefined;
    const result = await classSessionService.startLiveClass(req.params.id as string, instituteId, meetingUrl);
    sendSuccess(
      res,
      result,
      200,
      `Live class started successfully. ${result.notifiedStudentsCount} students notified.`
    );
  } catch (error) {
    next(error);
  }
};

export const endLiveSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await assertFacultyOwnsSession(toAuthUser(req), req.params.id as string);
    const result = await classSessionService.endLiveClass(req.params.id as string, instituteId);
    sendSuccess(res, result, 200, "Live class ended and recorded successfully");
  } catch (error) {
    next(error);
  }
};

export const getActiveLiveSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const branchId = req.user!.branchId || (req.query.branchId as string) || undefined;
    const roles = req.user?.roles || [];
    const isPureStudent = roles.includes("STUDENT") && !roles.includes("ADMIN") && !roles.includes("FACULTY");
    const isPureFaculty = roles.includes("FACULTY") && !roles.includes("ADMIN");

    let studentBatchIds: string[] | undefined = undefined;
    let facultyId: string | undefined = undefined;

    if (isPureStudent) {
      const studentRecord = await prisma.student.findFirst({
        where: { userId: req.user!.userId },
        include: {
          batchEnrollments: { where: { status: "ACTIVE" as any } },
        },
      });
      if (studentRecord) {
        studentBatchIds = (studentRecord.batchEnrollments || []).map((e: any) => e.batchId).filter(Boolean);
      }
    }

    if (isPureFaculty) {
      const facultyRecord = await prisma.faculty.findFirst({
        where: { userId: req.user!.userId },
      });
      if (facultyRecord) {
        facultyId = facultyRecord.id;
      }
    }

    const liveSessions = await classSessionService.getActiveLiveSessions(
      instituteId,
      branchId,
      studentBatchIds,
      facultyId
    );
    sendSuccess(res, liveSessions, 200, "Active live sessions retrieved successfully");
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

export const getSessionMeeting = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await classSessionService.getSessionMeeting(req.user, req.params.id as string);
    sendSuccess(res, result, 200, "Class meeting access details retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getMeetSpace = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await classSessionService.getMeetSpaceForSession(req.user, req.params.id as string);
    sendSuccess(res, result, 200, "Google Meet space details retrieved successfully");
  } catch (error) {
    next(error);
  }
};
