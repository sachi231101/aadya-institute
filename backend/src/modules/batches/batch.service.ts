import * as repository from "./batch.repository";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto, GenerateSessionsDto, BatchCourseItemDto } from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { eachDateInRange, formatDateKey } from "./batch-schedule.util";
import { getBatchCourseRows } from "../../utils/batch-course.util";
import * as studentAllocationService from "../students/student-allocation.service";
import * as facultyAllocationService from "../faculty/faculty-allocation.service";
import type { AuthUser } from "../auth/auth.types";

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

const validateBatchCourses = async (instituteId: string, items: BatchCourseItemDto[]) => {
  if (items.length === 0) {
    throw new AppError("Select at least one course", 400);
  }
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.courseId)) {
      throw new AppError("Duplicate course selected", 400);
    }
    seen.add(item.courseId);
    const course = await prisma.course.findFirst({
      where: { id: item.courseId, instituteId, status: "ACTIVE" },
    });
    if (!course) {
      throw new AppError("Active course not found", 404);
    }
    if (item.facultyId && item.facultyId.trim() !== "") {
      const faculty = await prisma.faculty.findFirst({
        where: { id: item.facultyId, instituteId, status: "ACTIVE" },
      });
      if (!faculty) {
        throw new AppError("Active faculty not found for course assignment", 404);
      }
    }
  }
};

export const createBatch = async (instituteId: string, defaultBranchId: string, data: CreateBatchDto) => {
  const courseItems = repository.normalizeBatchCourses(data);
  await validateBatchCourses(instituteId, courseItems);

  const payload: CreateBatchDto = {
    ...data,
    courseId: data.courseId || courseItems[0].courseId,
    courses: courseItems,
  };

  const existing = await repository.findAllBatches(instituteId, undefined, { search: data.code });
  if (existing.some((b) => b.code.toLowerCase() === data.code.toLowerCase())) {
    throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
  }
  return repository.createBatch(instituteId, defaultBranchId, payload);
};

export const updateBatch = async (id: string, instituteId: string, data: UpdateBatchDto) => {
  await getBatchById(id, instituteId);

  if (data.code) {
    const existing = await repository.findAllBatches(instituteId, undefined, { search: data.code });
    if (existing.some((b) => b.id !== id && b.code.toLowerCase() === data.code!.toLowerCase())) {
      throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
    }
  }

  if (data.courses && data.courses.length > 0) {
    await validateBatchCourses(instituteId, repository.normalizeBatchCourses(data));
  } else if (data.courseId) {
    await validateBatchCourses(instituteId, [{ courseId: data.courseId, facultyId: data.facultyId, sequence: 1 }]);
  }

  const result = await repository.updateBatch(id, instituteId, data);
  if (result.count === 0) {
    throw new AppError("Batch not found", 404);
  }
  return result;
};

export const assignFaculty = async (id: string, currentUser: AuthUser, facultyId: string) => {
  return facultyAllocationService.assignFacultyToBatch(currentUser, id, facultyId);
};

export const enrollStudent = async (batchId: string, instituteId: string, studentId: string, admissionId?: string) => {
  return studentAllocationService.assignStudentToBatch(batchId, studentId, instituteId, admissionId);
};

export const removeStudent = async (batchId: string, instituteId: string, studentId: string) => {
  return studentAllocationService.removeStudentFromBatch(batchId, studentId, instituteId);
};

export const transferStudent = async (
  studentId: string,
  fromBatchId: string,
  toBatchId: string,
  instituteId: string,
  admissionId?: string
) => {
  return studentAllocationService.transferStudent(
    studentId,
    fromBatchId,
    toBatchId,
    instituteId,
    admissionId
  );
};

export const getBatchStudents = async (batchId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  return repository.getBatchStudents(batchId);
};

export const deleteBatch = async (id: string, instituteId: string) => {
  await getBatchById(id, instituteId);

  const result = await prisma.$transaction(async (tx) => {
    // Admissions retain history; batchId is SetNull on delete via FK.
    return tx.batch.deleteMany({
      where: { id, instituteId },
    });
  });

  if (result.count === 0) {
    throw new AppError("Batch not found", 404);
  }
  return result;
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
  const coordinatorFacultyId = batch.facultyId;
  const subjectFacultyId =
    batch.batchCourses?.find((bc) => bc.facultyId)?.facultyId ?? null;
  const sessionFacultyId = coordinatorFacultyId || subjectFacultyId;
  if (!sessionFacultyId) {
    throw new AppError(
      "Assign faculty to the batch or at least one subject before generating class sessions",
      400
    );
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

  const subjectRows = getBatchCourseRows(batch);
  let subjectRotationIndex = 0;

  const resolveSessionForSlot = (): { facultyId: string; title: string } | null => {
    if (subjectRows.length === 0) {
      return {
        facultyId: sessionFacultyId,
        title: `${batch.course?.name || batch.name} — Class`,
      };
    }
    if (subjectRows.length === 1) {
      const row = subjectRows[0];
      const facultyId = row.facultyId || sessionFacultyId;
      if (!facultyId) return null;
      return {
        facultyId,
        title: `${row.course?.name || batch.name} — Class`,
      };
    }
    const row = subjectRows[subjectRotationIndex % subjectRows.length];
    subjectRotationIndex += 1;
    const facultyId = row.facultyId || coordinatorFacultyId || sessionFacultyId;
    if (!facultyId) return null;
    return {
      facultyId,
      title: `${row.course?.name || batch.name} — Class`,
    };
  };

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

      const resolved = resolveSessionForSlot();
      if (!resolved) continue;

      toCreate.push({
        batchId,
        facultyId: resolved.facultyId,
        branchId: batch.branchId,
        title: resolved.title,
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
