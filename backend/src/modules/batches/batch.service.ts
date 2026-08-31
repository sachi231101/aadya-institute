import * as repository from "./batch.repository";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto, GenerateSessionsDto } from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { eachDateInRange, formatDateKey } from "./batch-schedule.util";

const triggerBatchAssignedNotification = async (studentId: string, batchId: string) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { course: true },
    });

    if (!student || !batch) return;

    const idempotencyKey = buildIdempotencyKey.BATCH_ASSIGNED(studentId, batchId);

    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.BATCH_ASSIGNED,
      idempotencyKey,
      templateParams: {
        student_name: student.user?.name ?? "Student",
        batch_name: batch.name,
        course_name: batch.course?.name ?? "Course",
      },
      metadata: {
        batchId,
        courseId: batch.courseId,
      },
    });
  } catch (err) {
    logger.error({ err, studentId, batchId }, "[batches] Failed to trigger batch assigned notification");
  }
};

export const getBatches = async (instituteId: string, branchId?: string, filters: BatchQueryFilters = {}) => {
  return repository.findAllBatches(instituteId, branchId, filters);
};

export const getBatchById = async (id: string, instituteId: string) => {
  const batch = await repository.findBatchById(id, instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  return batch;
};

export const createBatch = async (instituteId: string, defaultBranchId: string, data: CreateBatchDto) => {
  const course = await prisma.course.findFirst({
    where: { id: data.courseId, instituteId, status: "ACTIVE" },
  });
  if (!course) {
    throw new AppError("Active course not found for this batch", 404);
  }

  const existing = await repository.findAllBatches(instituteId, undefined, { search: data.code });
  if (existing.some((b) => b.code.toLowerCase() === data.code.toLowerCase())) {
    throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
  }
  return repository.createBatch(instituteId, defaultBranchId, data);
};

export const updateBatch = async (id: string, instituteId: string, data: UpdateBatchDto) => {
  await getBatchById(id, instituteId);
  return repository.updateBatch(id, instituteId, data);
};

export const assignFaculty = async (id: string, instituteId: string, facultyId: string) => {
  await getBatchById(id, instituteId);
  return repository.assignFacultyToBatch(id, instituteId, facultyId);
};

export const enrollStudent = async (batchId: string, instituteId: string, studentId: string, admissionId?: string) => {
  await getBatchById(batchId, instituteId);
  const enrollment = await repository.enrollStudentInBatch(batchId, studentId, admissionId);

  setImmediate(() => {
    triggerBatchAssignedNotification(studentId, batchId);
  });

  return enrollment;
};

export const removeStudent = async (batchId: string, instituteId: string, studentId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.removeStudentFromBatch(batchId, studentId);
};

export const getBatchStudents = async (batchId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.getBatchStudents(batchId);
};

export const deleteBatch = async (id: string, instituteId: string) => {
  await getBatchById(id, instituteId);
  return repository.deleteBatch(id, instituteId);
};

export const getBatchSchedules = async (batchId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.findBatchSchedules(batchId, instituteId);
};

export const addBatchSchedule = async (batchId: string, instituteId: string, data: CreateBatchScheduleDto) => {
  await getBatchById(batchId, instituteId);
  const schedule = await repository.createBatchSchedule(batchId, instituteId, data);
  if (!schedule) throw new AppError("Failed to create batch schedule", 400);
  return schedule;
};

export const updateBatchScheduleEntry = async (
  batchId: string,
  scheduleId: string,
  instituteId: string,
  data: UpdateBatchScheduleDto
) => {
  await getBatchById(batchId, instituteId);
  const schedule = await repository.updateBatchSchedule(batchId, scheduleId, instituteId, data);
  if (!schedule) throw new AppError("Batch schedule not found", 404);
  return schedule;
};

export const deleteBatchScheduleEntry = async (batchId: string, scheduleId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  const deleted = await repository.deleteBatchSchedule(batchId, scheduleId, instituteId);
  if (!deleted) throw new AppError("Batch schedule not found", 404);
  return deleted;
};

export const generateClassSessionsFromSchedule = async (
  batchId: string,
  instituteId: string,
  options: GenerateSessionsDto = {}
) => {
  const batch = await getBatchById(batchId, instituteId);
  if (!batch.facultyId) {
    throw new AppError("Assign faculty to the batch before generating class sessions", 400);
  }

  const schedules = batch.schedules || [];
  if (schedules.length === 0) {
    throw new AppError("No batch schedules defined. Add weekly schedule slots first.", 400);
  }

  const rangeStart = options.startDate ? new Date(options.startDate) : new Date(batch.startDate);
  const rangeEnd = options.endDate
    ? new Date(options.endDate)
    : batch.expectedEndDate
      ? new Date(batch.expectedEndDate)
      : new Date(rangeStart.getTime() + 90 * 24 * 60 * 60 * 1000);

  const existingSessions = await prisma.classSession.findMany({
    where: {
      batchId,
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
    },
    select: { scheduledDate: true, startTime: true },
  });
  const existingKeys = new Set(
    existingSessions.map((s) => `${formatDateKey(s.scheduledDate)}|${s.startTime}`)
  );

  const courseName = batch.course?.name || batch.name;
  const dates = eachDateInRange(rangeStart, rangeEnd);
  const toCreate: Array<{
    batchId: string;
    facultyId: string;
    branchId: string;
    title: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    sessionStatus: "UPCOMING";
    sessionType: "THEORY";
    mode: string;
  }> = [];

  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const matchingSlots = schedules.filter((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      const effectiveFrom = new Date(slot.effectiveFrom);
      effectiveFrom.setHours(0, 0, 0, 0);
      if (date < effectiveFrom) return false;
      if (slot.effectiveTo) {
        const effectiveTo = new Date(slot.effectiveTo);
        effectiveTo.setHours(23, 59, 59, 999);
        if (date > effectiveTo) return false;
      }
      return true;
    });

    for (const slot of matchingSlots) {
      const key = `${formatDateKey(date)}|${slot.startTime}`;
      if (existingKeys.has(key)) continue;
      toCreate.push({
        batchId,
        facultyId: batch.facultyId,
        branchId: batch.branchId,
        title: `${courseName} — Class`,
        scheduledDate: new Date(date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionStatus: "UPCOMING",
        sessionType: "THEORY",
        mode: "OFFLINE",
      });
      existingKeys.add(key);
    }
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: existingSessions.length, sessions: [] };
  }

  await prisma.classSession.createMany({ data: toCreate });
  const createdSessions = await prisma.classSession.findMany({
    where: {
      batchId,
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
  });

  return {
    created: toCreate.length,
    skipped: existingSessions.length,
    sessions: createdSessions,
  };
};
