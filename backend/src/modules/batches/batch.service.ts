import * as repository from "./batch.repository";
import { CreateBatchDto, UpdateBatchDto, BatchQueryFilters, CreateBatchScheduleDto, UpdateBatchScheduleDto, GenerateSessionsDto, BatchCourseItemDto } from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { eachDateKeyInRange, formatDateKey, utcNoonFromDateKey, dayOfWeekFromDateKey } from "./batch-schedule.util";
import * as studentAllocationService from "../students/student-allocation.service";
import * as facultyAllocationService from "../faculty/faculty-allocation.service";
import type { AuthUser } from "../auth/auth.types";
import { logger } from "../../config/logger";
import { assertCourseAvailableForBranch } from "../../utils/course-branch.util";

export const getBatches = async (
  instituteId: string,
  branchId?: string,
  filters: BatchQueryFilters = {},
  branchIds?: string[]
) => {
  return repository.findAllBatches(instituteId, branchId, filters, branchIds);
};

export const getBatchById = async (id: string, instituteId: string) => {
  const batch = await repository.findBatchById(id, instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  return batch;
};

const validateBatchCourses = async (
  instituteId: string,
  items: BatchCourseItemDto[],
  branchId?: string
) => {
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
    if (branchId) {
      await assertCourseAvailableForBranch(instituteId, item.courseId, branchId, {
        requireActive: true,
      });
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
  const effectiveBranchId = data.branchId || defaultBranchId;
  await validateBatchCourses(instituteId, courseItems, effectiveBranchId || undefined);

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
  const batch = await repository.createBatch(instituteId, defaultBranchId, payload);

  // Bridge schedule lines → ClassSession so faculty dashboard/attendance sees classes immediately.
  if (data.scheduleLines && data.scheduleLines.length > 0) {
    try {
      const sync = await generateClassSessionsFromSchedule(batch.id, instituteId, {});
      return { ...batch, sessionSync: sync };
    } catch (err) {
      logger.warn(
        { err, batchId: batch.id },
        "Batch created but class session sync skipped"
      );
    }
  }

  return batch;
};

export const updateBatch = async (id: string, instituteId: string, data: UpdateBatchDto) => {
  const existingBatch = await getBatchById(id, instituteId);

  if (data.code) {
    const existing = await repository.findAllBatches(instituteId, undefined, { search: data.code });
    if (existing.some((b) => b.id !== id && b.code.toLowerCase() === data.code!.toLowerCase())) {
      throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
    }
  }

  const targetBranchId = existingBatch.branchId;

  if (data.scheduleLines && data.scheduleLines.length > 0) {
    await validateBatchCourses(instituteId, repository.normalizeBatchCourses(data), targetBranchId);
  } else if (data.courses && data.courses.length > 0) {
    await validateBatchCourses(instituteId, repository.normalizeBatchCourses(data), targetBranchId);
  } else if (data.courseId) {
    await validateBatchCourses(
      instituteId,
      [{ courseId: data.courseId, facultyId: data.facultyId, sequence: 1 }],
      targetBranchId
    );
  }

  const result = await repository.updateBatch(id, instituteId, data);
  if (result.count === 0) {
    throw new AppError("Batch not found", 404);
  }

  // Re-sync upcoming sessions whenever schedule lines are sent (including clearing/disabling Att?).
  if (data.scheduleLines !== undefined) {
    try {
      const sync = await generateClassSessionsFromSchedule(id, instituteId, {});
      return { ...result, sessionSync: sync };
    } catch (err) {
      logger.warn({ err, batchId: id }, "Batch updated but class session sync skipped");
    }
  }

  return result;
};

export const assignFaculty = async (id: string, currentUser: AuthUser, facultyId: string) => {
  return facultyAllocationService.assignFacultyToBatch(currentUser, id, facultyId);
};

export const enrollStudent = async (
  batchId: string,
  instituteId: string,
  studentId: string,
  currentUser: AuthUser,
  admissionId?: string
) => {
  return studentAllocationService.assignStudentToBatch(
    batchId,
    studentId,
    instituteId,
    currentUser,
    admissionId
  );
};

export const bulkEnrollStudents = async (
  batchId: string,
  instituteId: string,
  studentIds: string[],
  currentUser: AuthUser
) => {
  return studentAllocationService.bulkAssignStudentsToBatch(
    batchId,
    studentIds,
    instituteId,
    currentUser
  );
};

export const removeStudent = async (
  batchId: string,
  instituteId: string,
  studentId: string,
  currentUser: AuthUser
) => {
  return studentAllocationService.removeStudentFromBatch(
    batchId,
    studentId,
    instituteId,
    currentUser
  );
};

export const transferStudent = async (
  studentId: string,
  fromBatchId: string,
  toBatchId: string,
  instituteId: string,
  currentUser: AuthUser,
  admissionId?: string
) => {
  return studentAllocationService.transferStudent(
    studentId,
    fromBatchId,
    toBatchId,
    instituteId,
    currentUser,
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
  try {
    await generateClassSessionsFromSchedule(batchId, instituteId, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule added but class session sync skipped");
  }
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
  try {
    await generateClassSessionsFromSchedule(batchId, instituteId, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule updated but class session sync skipped");
  }
  return schedule;
};

export const deleteBatchScheduleEntry = async (batchId: string, scheduleId: string, instituteId: string) => {
  await getBatchById(batchId, instituteId);
  const deleted = await repository.deleteBatchSchedule(batchId, scheduleId, instituteId);
  if (!deleted) throw new AppError("Batch schedule not found", 404);
  try {
    await generateClassSessionsFromSchedule(batchId, instituteId, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule deleted but class session sync skipped");
  }
  return deleted;
};

export const generateClassSessionsFromSchedule = async (
  batchId: string,
  instituteId: string,
  options: GenerateSessionsDto = {}
) => {
  const batch = await getBatchById(batchId, instituteId);
  const coordinatorFacultyId = batch.facultyId;
  const allSchedules = (batch.schedules || []).filter((s) => {
    const status = String((s as { status?: string }).status || "ACTIVE").toUpperCase();
    if (status === "INACTIVE") return false;
    // Att? unchecked → do not create/update attendance class sessions for this line
    if ((s as { attendanceEnabled?: boolean }).attendanceEnabled === false) return false;
    return true;
  });

  const todayKey = formatDateKey(new Date());
  const defaultEndFromStart = formatDateKey(
    new Date(utcNoonFromDateKey(formatDateKey(options.startDate || batch.startDate)).getTime() + 90 * 24 * 60 * 60 * 1000)
  );
  const rangeStartKey = formatDateKey(options.startDate || batch.startDate);
  const rangeEndKey = formatDateKey(
    options.endDate ||
      batch.expectedEndDate ||
      // Cover at least ~3 months from today so current-week admin/faculty timetables stay filled
      (defaultEndFromStart > todayKey ? defaultEndFromStart : formatDateKey(new Date(utcNoonFromDateKey(todayKey).getTime() + 90 * 24 * 60 * 60 * 1000)))
  );
  const rangeStart = utcNoonFromDateKey(rangeStartKey);
  const rangeEnd = utcNoonFromDateKey(rangeEndKey);

  // No active Att? lines → cancel upcoming sessions in range so admin/faculty timetables clear.
  if (allSchedules.length === 0) {
    const cancelledResult = await prisma.classSession.updateMany({
      where: {
        batchId,
        scheduledDate: { gte: rangeStart, lte: rangeEnd },
        status: "ACTIVE",
        sessionStatus: "UPCOMING",
      },
      data: { sessionStatus: "CANCELLED" },
    });
    return {
      created: 0,
      updated: 0,
      cancelled: cancelledResult.count,
      skipped: 0,
      sessions: [],
      message:
        "No active attendance schedule lines. Upcoming class sessions in range were cancelled.",
    };
  }

  const existingSessions = await prisma.classSession.findMany({
    where: {
      batchId,
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
      status: "ACTIVE",
    },
    select: {
      id: true,
      scheduledDate: true,
      startTime: true,
      endTime: true,
      batchCourseId: true,
      facultyId: true,
      classroomMasterId: true,
      timeslotMasterId: true,
      roomNo: true,
      sessionStatus: true,
      batchCourse: { select: { courseId: true } },
    },
  });

  const sessionCourseKey = (s: {
    scheduledDate: Date;
    startTime: string;
    batchCourseId: string | null;
    batchCourse?: { courseId: string } | null;
    facultyId: string;
  }) => {
    const coursePart =
      s.batchCourse?.courseId || s.batchCourseId || s.facultyId || "none";
    return `${formatDateKey(s.scheduledDate)}|${s.startTime}|${coursePart}`;
  };

  const existingByKey = new Map(
    existingSessions.map((s) => [sessionCourseKey(s), s])
  );

  type SessionDraft = {
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
    roomNo: string | null;
    sessionStatus: "UPCOMING";
    sessionType: "THEORY";
    mode: string;
  };

  const toCreate: SessionDraft[] = [];
  const toUpdate: Array<{
    id: string;
    facultyId: string;
    classroomMasterId: string | null;
    timeslotMasterId: string | null;
    endTime: string;
    roomNo: string | null;
    batchCourseId: string | null;
  }> = [];
  const matchedSessionIds = new Set<string>();

  const dateKeys = eachDateKeyInRange(rangeStartKey, rangeEndKey);
  for (const dateKey of dateKeys) {
    const dayOfWeek = dayOfWeekFromDateKey(dateKey);
    const matchingSlots = allSchedules.filter((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      const fromKey = formatDateKey(slot.effectiveFrom);
      if (dateKey < fromKey) return false;
      if (slot.effectiveTo) {
        const toKey = formatDateKey(slot.effectiveTo);
        if (dateKey > toKey) return false;
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
      const bc = batch.batchCourses?.find((c) => c.id === batchCourseId);
      const courseId = bc?.courseId || (slot as { batchCourse?: { courseId?: string } }).batchCourse?.courseId;
      const key = `${dateKey}|${slot.startTime}|${courseId || batchCourseId || lineFaculty || "none"}`;
      const classroomMasterId =
        (slot as { classroomMasterId?: string | null }).classroomMasterId ??
        bc?.classroomMasterId ??
        batch.classroomMasterId ??
        null;
      const timeslotMasterId =
        (slot as { timeslotMasterId?: string | null }).timeslotMasterId ??
        bc?.timeslotMasterId ??
        batch.timeslotMasterId ??
        null;

      const existing = existingByKey.get(key);
      if (existing) {
        // Keep LIVE/COMPLETED intact for status; still refresh faculty/room on UPCOMING/CANCELLED
        const canReassign =
          existing.sessionStatus === "UPCOMING" || existing.sessionStatus === "CANCELLED";
        if (
          canReassign &&
          (existing.facultyId !== lineFaculty ||
            existing.classroomMasterId !== classroomMasterId ||
            existing.timeslotMasterId !== timeslotMasterId ||
            existing.endTime !== slot.endTime ||
            existing.batchCourseId !== batchCourseId)
        ) {
          toUpdate.push({
            id: existing.id,
            facultyId: lineFaculty,
            classroomMasterId,
            timeslotMasterId,
            endTime: slot.endTime,
            roomNo: existing.roomNo,
            batchCourseId,
          });
        }
        matchedSessionIds.add(existing.id);
        continue;
      }

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
        scheduledDate: utcNoonFromDateKey(dateKey),
        startTime: slot.startTime,
        endTime: slot.endTime,
        classroomMasterId,
        timeslotMasterId,
        roomNo: null,
        sessionStatus: "UPCOMING",
        sessionType: "THEORY",
        mode: "OFFLINE",
      });
      existingByKey.set(key, {
        id: `pending-${key}`,
        scheduledDate: utcNoonFromDateKey(dateKey),
        startTime: slot.startTime,
        endTime: slot.endTime,
        batchCourseId,
        facultyId: lineFaculty,
        classroomMasterId,
        timeslotMasterId,
        roomNo: null,
        sessionStatus: "UPCOMING",
        batchCourse: courseId ? { courseId } : null,
      });
    }
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    const hasAnyFaculty =
      Boolean(coordinatorFacultyId) ||
      Boolean(batch.batchCourses?.some((bc) => bc.facultyId)) ||
      Boolean(allSchedules.some((s) => (s as { facultyId?: string | null }).facultyId));
    if (!hasAnyFaculty && matchedSessionIds.size === 0) {
      throw new AppError(
        "Assign faculty on schedule lines (or batch/subjects) before generating class sessions",
        400
      );
    }
  }

  const classroomIds = [
    ...new Set(
      [...toCreate, ...toUpdate]
        .map((row) => row.classroomMasterId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const roomById = new Map<string, string>();
  if (classroomIds.length > 0) {
    const classrooms = await prisma.masterRecord.findMany({
      where: { id: { in: classroomIds }, entityType: "classroom" },
      select: { id: true, name: true },
    });
    for (const c of classrooms) roomById.set(c.id, c.name);
  }
  for (const row of toCreate) {
    if (row.classroomMasterId) {
      row.roomNo = roomById.get(row.classroomMasterId) ?? null;
    }
  }
  for (const row of toUpdate) {
    if (row.classroomMasterId) {
      row.roomNo = roomById.get(row.classroomMasterId) ?? row.roomNo;
    }
  }

  if (toCreate.length > 0) {
    await prisma.classSession.createMany({ data: toCreate });
  }
  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((row) =>
        prisma.classSession.update({
          where: { id: row.id },
          data: {
            facultyId: row.facultyId,
            batchCourseId: row.batchCourseId,
            classroomMasterId: row.classroomMasterId,
            timeslotMasterId: row.timeslotMasterId,
            endTime: row.endTime,
            roomNo: row.roomNo,
            sessionStatus: "UPCOMING",
          },
        })
      )
    );
  }

  // Cancel UPCOMING sessions that no longer match an active schedule line (day/time/faculty changed).
  const orphanIds = existingSessions
    .filter(
      (s) =>
        s.sessionStatus === "UPCOMING" &&
        !matchedSessionIds.has(s.id) &&
        !s.id.startsWith("pending-")
    )
    .map((s) => s.id);
  let cancelled = 0;
  if (orphanIds.length > 0) {
    const result = await prisma.classSession.updateMany({
      where: { id: { in: orphanIds }, sessionStatus: "UPCOMING" },
      data: { sessionStatus: "CANCELLED" },
    });
    cancelled = result.count;
  }

  const createdSessions = await prisma.classSession.findMany({
    where: {
      batchId,
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
      status: "ACTIVE",
      sessionStatus: { not: "CANCELLED" },
    },
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
  });

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    cancelled,
    skipped: Math.max(0, existingSessions.length - toUpdate.length - cancelled),
    sessions: createdSessions,
  };
};

export const getAvailableFaculty = async (
  instituteId: string,
  query: import("./batch.types").AvailableFacultyQuery
) => {
  return repository.findAvailableFaculty(instituteId, query);
};
