import * as repository from "./batch.repository";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto, GenerateSessionsDto, BatchCourseItemDto } from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { eachDateInRange, formatDateKey } from "./batch-schedule.util";
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
    scheduleLines: data.scheduleLines,
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

  if (data.scheduleLines && data.scheduleLines.length > 0) {
    await validateBatchCourses(instituteId, repository.normalizeBatchCourses(data));
  } else if (data.courses && data.courses.length > 0) {
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
  const allSchedules = (batch.schedules || []).filter(
    (s) => (s as { status?: string }).status !== "INACTIVE"
  );

  if (allSchedules.length === 0) {
    throw new AppError("No active schedule lines defined. Add weekly schedule slots first.", 400);
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
    select: { scheduledDate: true, startTime: true, batchCourseId: true },
  });
  const existingKeys = new Set(
    existingSessions.map(
      (s) => `${formatDateKey(s.scheduledDate)}|${s.startTime}|${s.batchCourseId ?? "none"}`
    )
  );

  const toCreate: Array<{
    batchId: string;
    batchCourseId: string | null;
    facultyId: string;
    branchId: string;
    title: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    classroomMasterId: string | null;
    timeslotMasterId: string | null;
    sessionStatus: "UPCOMING";
    sessionType: "THEORY";
    mode: string;
  }> = [];

  const dates = eachDateInRange(rangeStart, rangeEnd);
  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const matchingSlots = allSchedules.filter((slot) => {
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
      const lineFaculty =
        (slot as { facultyId?: string | null }).facultyId ||
        batch.batchCourses?.find((bc) => bc.id === slot.batchCourseId)?.facultyId ||
        coordinatorFacultyId;
      if (!lineFaculty) continue;

      const batchCourseId = slot.batchCourseId ?? null;
      const key = `${formatDateKey(date)}|${slot.startTime}|${batchCourseId ?? "none"}`;
      if (existingKeys.has(key)) continue;

      const bc = batch.batchCourses?.find((c) => c.id === batchCourseId);
      const courseName =
        (slot as { batchCourse?: { course?: { name?: string } } }).batchCourse?.course?.name ||
        bc?.course?.name ||
        batch.course?.name ||
        batch.name;

      toCreate.push({
        batchId,
        batchCourseId,
        facultyId: lineFaculty,
        branchId: batch.branchId,
        title: `${courseName} — Class`,
        scheduledDate: new Date(date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        classroomMasterId:
          (slot as { classroomMasterId?: string | null }).classroomMasterId ??
          bc?.classroomMasterId ??
          batch.classroomMasterId ??
          null,
        timeslotMasterId:
          (slot as { timeslotMasterId?: string | null }).timeslotMasterId ??
          bc?.timeslotMasterId ??
          batch.timeslotMasterId ??
          null,
        sessionStatus: "UPCOMING",
        sessionType: "THEORY",
        mode: "OFFLINE",
      });
      existingKeys.add(key);
    }
  }

  if (toCreate.length === 0) {
    const hasAnyFaculty =
      Boolean(coordinatorFacultyId) ||
      Boolean(batch.batchCourses?.some((bc) => bc.facultyId)) ||
      Boolean(allSchedules.some((s) => (s as { facultyId?: string | null }).facultyId));
    if (!hasAnyFaculty) {
      throw new AppError(
        "Assign faculty on schedule lines (or batch/subjects) before generating class sessions",
        400
      );
    }
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

export const getAvailableFaculty = async (
  instituteId: string,
  query: import("./batch.types").AvailableFacultyQuery
) => {
  return repository.findAvailableFaculty(instituteId, query);
};
