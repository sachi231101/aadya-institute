import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { prisma } from "../../config/database";
import { isPureFaculty, toAuthUser } from "../../utils/auth-user.util";
import { sendSuccess } from "../../utils/response";
import * as service from "./batch.service";
import * as curriculumService from "./batch-curriculum.service";

export const getAll = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = toAuthUser(req);
    const roles = req.user?.roles || [];
    const pureFaculty = isPureFaculty(roles);

    let facultyFilter = req.query.facultyId as string | undefined;
    let skipBranchScope = false;

    // Faculty see batches they teach across branches (enrollment/teaching scope),
    // not only the primary user.branchId (which can differ from batch.branchId).
    if (pureFaculty) {
      const facultyRecord = await prisma.faculty.findFirst({
        where: { userId: req.user!.userId },
      });
      if (!facultyRecord) {
        res.json({
          success: true,
          message: "Batches retrieved successfully",
          data: [],
        });
        return;
      }
      facultyFilter = facultyRecord.id;
      skipBranchScope = true;
    }

    const filters = {
      search: req.query.search as string,
      courseId: req.query.courseId as string,
      facultyId: facultyFilter,
      status: req.query.status as string,
    };
    const batches = await service.getBatches(user, filters, {
      requestedBranchId: req.query.branchId as string | undefined,
      skipBranchScope,
    });
    res.json({
      success: true,
      message: "Batches retrieved successfully",
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await service.getBatchById(req.params.id as string, toAuthUser(req));
    res.json({
      success: true,
      message: "Batch details retrieved successfully",
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await service.createBatch(toAuthUser(req), req.body);
    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.updateBatch(
      req.params.id as string,
      toAuthUser(req),
      req.body
    );
    res.json({
      success: true,
      message: "Batch updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const assignFaculty = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = toAuthUser(req);
    await service.assignFaculty(req.params.id as string, user, req.body.facultyId);
    res.json({
      success: true,
      message: "Faculty assigned to batch successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const students = await service.getBatchStudents(
      req.params.id as string,
      toAuthUser(req)
    );
    res.json({
      success: true,
      message: "Batch students retrieved successfully",
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

export const enrollStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const enrollment = await service.enrollStudent(
      req.params.id as string,
      instituteId,
      req.body.studentId,
      toAuthUser(req),
      req.body.admissionId
    );
    res.status(201).json({
      success: true,
      message: "Student enrolled in batch successfully",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const bulkEnrollStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const result = await service.bulkEnrollStudents(
      req.params.id as string,
      instituteId,
      req.body.studentIds,
      toAuthUser(req)
    );
    const parts = [
      `Assigned ${result.assigned}`,
      result.skipped > 0 ? `skipped ${result.skipped}` : null,
      result.failures.length > 0 ? `${result.failures.length} failed` : null,
    ].filter(Boolean);

    // All soft-failures / already-in-batch: surface as HTTP error so the UI does not treat it as success
    if (result.assigned === 0 && result.failures.length > 0) {
      const alreadyOnly = result.failures.every((f) =>
        f.message.toLowerCase().includes("already assigned to this batch")
      );
      const firstMessage = alreadyOnly
        ? result.failures.length === 1
          ? "This student is already assigned to this batch"
          : `All ${result.failures.length} selected students are already assigned to this batch`
        : result.failures[0]?.message || "Could not assign students to this batch";
      res.status(400).json({
        success: false,
        message: firstMessage,
        data: result,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: parts.join(", "),
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const removeStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    await service.removeStudent(
      req.params.id as string,
      instituteId,
      req.params.studentId as string,
      toAuthUser(req)
    );
    res.json({
      success: true,
      message: "Student removed from batch successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const transferStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const instituteId = req.user!.instituteId;
    const { studentId, fromBatchId, toBatchId, admissionId } = req.body;
    const enrollment = await service.transferStudent(
      studentId,
      fromBatchId,
      toBatchId,
      instituteId,
      toAuthUser(req),
      admissionId
    );
    res.json({
      success: true,
      message: "Student transferred successfully",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await service.deleteBatch(req.params.id as string, toAuthUser(req));
    sendSuccess(res, { id: req.params.id, deleted: true }, 200, "Batch deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getSchedules = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedules = await service.getBatchSchedules(
      req.params.id as string,
      toAuthUser(req)
    );
    sendSuccess(res, schedules, 200, "Batch schedules retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedule = await service.addBatchSchedule(
      req.params.id as string,
      toAuthUser(req),
      req.body
    );
    sendSuccess(res, schedule, 201, "Batch schedule created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedule = await service.updateBatchScheduleEntry(
      req.params.id as string,
      req.params.scheduleId as string,
      toAuthUser(req),
      req.body
    );
    sendSuccess(res, schedule, 200, "Batch schedule updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await service.deleteBatchScheduleEntry(
      req.params.id as string,
      req.params.scheduleId as string,
      toAuthUser(req)
    );
    sendSuccess(res, { deleted: true }, 200, "Batch schedule deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const generateSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await service.generateClassSessionsFromSchedule(
      req.params.id as string,
      toAuthUser(req),
      req.body
    );
    sendSuccess(
      res,
      result,
      200,
      result.message ||
        `Generated ${result.created} class session(s)${result.updated ? `, updated ${result.updated}` : ""}`
    );
  } catch (error) {
    next(error);
  }
};

export const getAvailableFaculty = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const faculty = await service.getAvailableFaculty(toAuthUser(req), {
      dayOfWeek: Number(req.query.dayOfWeek),
      startTime: req.query.startTime as string | undefined,
      endTime: req.query.endTime as string | undefined,
      timeslotMasterId: req.query.timeslotMasterId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      branchId: req.query.branchId as string | undefined,
      excludeBatchId: req.query.excludeBatchId as string | undefined,
    });
    sendSuccess(res, faculty, 200, "Available faculty retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getCurriculum = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await curriculumService.getBatchCurriculum(
      req.params.id as string,
      req.user!.instituteId,
      toAuthUser(req)
    );
    sendSuccess(res, data, 200, "Batch curriculum retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const markModuleCompletion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await curriculumService.markBatchModuleCompletion(
      req.params.id as string,
      req.params.batchModuleId as string,
      req.user!.instituteId,
      toAuthUser(req),
      Boolean(req.body.isCompleted)
    );
    sendSuccess(res, data, 200, "Batch module progress updated successfully");
  } catch (error) {
    next(error);
  }
};

export const markTopicCompletion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await curriculumService.markBatchTopicCompletion(
      req.params.id as string,
      req.params.batchModuleId as string,
      req.params.topicId as string,
      req.user!.instituteId,
      toAuthUser(req),
      Boolean(req.body.isCompleted)
    );
    sendSuccess(res, data, 200, "Batch topic progress updated successfully");
  } catch (error) {
    next(error);
  }
};
