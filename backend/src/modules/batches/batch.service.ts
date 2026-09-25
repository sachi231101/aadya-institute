import * as repository from "./batch.repository";
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchQueryFilters,
  CreateBatchScheduleDto,
  UpdateBatchScheduleDto,
  GenerateSessionsDto,
  BatchCourseItemDto,
  ScheduleLineDto,
} from "./batch.types";
import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { eachDateKeyInRange, formatDateKey, utcNoonFromDateKey, dayOfWeekFromDateKey } from "./batch-schedule.util";
import {
  resolveBatchLifecycleStatus,
  type BatchLifecycleStatus,
} from "./batch-lifecycle-status.util";
import * as studentAllocationService from "../students/student-allocation.service";
import * as facultyAllocationService from "../faculty/faculty-allocation.service";
import type { AuthUser } from "../auth/auth.types";
import { logger } from "../../config/logger";
import { assertCourseAvailableForBranch } from "../../utils/course-branch.util";
import {
  assertBranchRecordAccess,
  getBranchScopeFilter,
  hasBranchAccess,
  isBranchLockedRole,
} from "../../utils/branch-isolation.util";
import { assertFacultyOwnsBatch, isPureFaculty } from "../../utils/auth-user.util";

export { resolveBatchLifecycleStatus } from "./batch-lifecycle-status.util";

export const FACULTY_SCHEDULE_CONFLICT_MESSAGE =
  "This faculty member is already assigned to another class at this time. Please select a different time slot or faculty member.";

type FacultyConflictLine = {
  facultyId?: string | null;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  timeslotMasterId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | string | null;
};

const facultyConflictSlotKey = (line: FacultyConflictLine): string => {
  const timeslot = line.timeslotMasterId?.trim() || "";
  const start = line.startTime?.trim() || "";
  const end = line.endTime?.trim() || "";
  return `${line.facultyId}|${line.dayOfWeek}|${timeslot}|${start}|${end}`;
};

/**
 * Reject when faculty already holds the same ACTIVE day+slot on another batch,
 * or when the payload itself duplicates faculty/day/slot.
 */
export const assertNoFacultyScheduleConflicts = async (params: {
  instituteId: string;
  lines: FacultyConflictLine[];
  startDate?: string | Date | null;
  expectedEndDate?: string | Date | null;
  excludeBatchId?: string;
  excludeScheduleId?: string;
}): Promise<void> => {
  const activeLines = params.lines.filter(
    (line) =>
      line.facultyId &&
      String(line.facultyId).trim() !== "" &&
      line.status !== "INACTIVE"
  );
  if (activeLines.length === 0) return;

  const asScheduleLines: ScheduleLineDto[] = activeLines.map((line) => ({
    courseId: "",
    dayOfWeek: line.dayOfWeek,
    facultyId: line.facultyId || undefined,
    startTime: line.startTime || undefined,
    endTime: line.endTime || undefined,
    timeslotMasterId: line.timeslotMasterId || undefined,
    status: line.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  }));

  const enriched = await repository.enrichScheduleLinesWithMasterTimes(asScheduleLines);

  const seen = new Set<string>();
  for (const line of enriched) {
    if (!line.facultyId) continue;
    const key = facultyConflictSlotKey(line);
    if (seen.has(key)) {
      throw new AppError(FACULTY_SCHEDULE_CONFLICT_MESSAGE, 400);
    }
    seen.add(key);
  }

  const startDate =
    params.startDate instanceof Date
      ? params.startDate.toISOString()
      : params.startDate || undefined;
  const endDate =
    params.expectedEndDate instanceof Date
      ? params.expectedEndDate.toISOString()
      : params.expectedEndDate || undefined;

  for (const line of enriched) {
    if (!line.facultyId) continue;
    const hasConflict = await repository.hasFacultyScheduleConflict({
      instituteId: params.instituteId,
      facultyId: line.facultyId,
      dayOfWeek: line.dayOfWeek,
      startTime: line.startTime,
      endTime: line.endTime,
      timeslotMasterId: line.timeslotMasterId,
      startDate,
      endDate,
      excludeBatchId: params.excludeBatchId,
      excludeScheduleId: params.excludeScheduleId,
    });
    if (hasConflict) {
      throw new AppError(FACULTY_SCHEDULE_CONFLICT_MESSAGE, 400);
    }
  }
};

/**
 * Resolve and authorize a single branchId for batch create.
 * - Admin: use requested if ACTIVE; auto-pick when exactly one ACTIVE branch; else 400 if unset
 * - Branch-locked: force single allowed branch (ignore spoof); multi-allowed require request + hasBranchAccess
 */
const resolveAuthorizedBranchId = async (
  user: AuthUser,
  requested?: string
): Promise<string> => {
  const activeBranches = await prisma.branch.findMany({
    where: { instituteId: user.instituteId, status: "ACTIVE" },
    select: { id: true },
  });
  const activeIds = new Set(activeBranches.map((b) => b.id));

  if (activeIds.size === 0) {
    throw new AppError("No active branches available for this institute", 400);
  }

  if (isBranchLockedRole(user.roles)) {
    const allowed = user.allowedBranchIds?.length
      ? user.allowedBranchIds
      : user.branchId
        ? [user.branchId]
        : [];

    if (allowed.length === 0) {
      throw new AppError("Branch assignment required", 403);
    }

    if (allowed.length === 1) {
      const forced = allowed[0];
      if (!activeIds.has(forced)) {
        throw new AppError("Assigned branch is invalid or inactive", 400);
      }
      return forced;
    }

    const branchId = requested?.trim() || "";
    if (!branchId) {
      throw new AppError("Select a branch", 400);
    }
    if (!activeIds.has(branchId)) {
      throw new AppError("Selected branch is invalid or inactive", 400);
    }
    if (!hasBranchAccess(user, branchId)) {
      throw new AppError("You do not have access to this branch", 403);
    }
    return branchId;
  }

  let branchId = requested?.trim() || "";
  if (!branchId && activeIds.size === 1) {
    branchId = activeBranches[0].id;
  }
  if (!branchId) {
    throw new AppError("Select a branch", 400);
  }
  if (!activeIds.has(branchId)) {
    throw new AppError("Selected branch is invalid or inactive", 400);
  }
  return branchId;
};

/** Load batch by institute, then enforce faculty teaching scope or branch access (404 when out of scope). */
const loadBatchForUser = async (id: string, user: AuthUser) => {
  const batch = await repository.findBatchById(id, user.instituteId);
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  if (isPureFaculty(user.roles)) {
    await assertFacultyOwnsBatch(user, id);
    return batch;
  }
  assertBranchRecordAccess(user, batch.branchId, "Batch not found");
  return batch;
};

/**
 * Persist lifecycle status when stored value drifts from start/end dates.
 * CANCELLED is never overwritten by date rules.
 */
const reconcileBatchLifecycleRows = async (
  rows: Array<{
    id: string;
    status: string;
    startDate: Date;
    expectedEndDate: Date | null;
  }>
): Promise<void> => {
  const byStatus = new Map<BatchLifecycleStatus, string[]>();
  for (const row of rows) {
    const resolved = resolveBatchLifecycleStatus({
      startDate: row.startDate,
      expectedEndDate: row.expectedEndDate,
      currentStatus: row.status,
    });
    if (resolved === row.status) continue;
    const list = byStatus.get(resolved) || [];
    list.push(row.id);
    byStatus.set(resolved, list);
  }
  for (const [status, ids] of byStatus) {
    await repository.updateBatchStatusesByIds(ids, status);
  }
};

const reconcileBatchesInScope = async (
  instituteId: string,
  branchId?: string,
  branchIds?: string[]
): Promise<void> => {
  const rows = await repository.findBatchLifecycleRows(instituteId, branchId, branchIds);
  await reconcileBatchLifecycleRows(rows);
};

const resolveStatusForWrite = (params: {
  startDate: Date | string;
  expectedEndDate?: Date | string | null;
  /** Client may only force CANCELLED; other lifecycle values are ignored. */
  requestedStatus?: string | null;
}): BatchLifecycleStatus =>
  resolveBatchLifecycleStatus({
    startDate: params.startDate,
    expectedEndDate: params.expectedEndDate,
    currentStatus: params.requestedStatus === "CANCELLED" ? "CANCELLED" : undefined,
  });

export const getBatches = async (
  user: AuthUser,
  filters: BatchQueryFilters = {},
  options?: {
    requestedBranchId?: string;
    /** Pure faculty: teaching desk via facultyId filter; skip branch scope. */
    skipBranchScope?: boolean;
  }
) => {
  if (options?.skipBranchScope) {
    await reconcileBatchesInScope(user.instituteId);
    return repository.findAllBatches(user.instituteId, undefined, filters);
  }

  // Misconfigured JWT: branch-locked with no branch assignment → no institute-wide leak
  if (isBranchLockedRole(user.roles)) {
    const allowed = user.allowedBranchIds ?? [];
    if (allowed.length === 0 && !user.branchId) {
      return [];
    }
  }

  const scope = getBranchScopeFilter(user, options?.requestedBranchId);
  await reconcileBatchesInScope(user.instituteId, scope.branchId, scope.branchIds);
  return repository.findAllBatches(
    user.instituteId,
    scope.branchId,
    filters,
    scope.branchIds
  );
};

export const getBatchById = async (id: string, user: AuthUser) => {
  const batch = await loadBatchForUser(id, user);
  const resolved = resolveBatchLifecycleStatus({
    startDate: batch.startDate,
    expectedEndDate: batch.expectedEndDate,
    currentStatus: batch.status,
  });
  if (resolved !== batch.status) {
    await repository.updateBatchStatusesByIds([batch.id], resolved);
    return { ...batch, status: resolved };
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

const sessionSyncFailure = (err: unknown) => {
  const message =
    err instanceof AppError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Class session sync failed";
  return {
    created: 0,
    updated: 0,
    cancelled: 0,
    skipped: 0,
    skippedHolidays: 0,
    skippedConflicts: 0,
    sessions: [] as unknown[],
    error: message,
    message: `Batch saved but timetable sync failed: ${message}`,
  };
};

export const createBatch = async (user: AuthUser, data: CreateBatchDto) => {
  const branchId = await resolveAuthorizedBranchId(user, data.branchId);
  const courseItems = repository.normalizeBatchCourses(data);
  await validateBatchCourses(user.instituteId, courseItems, branchId);

  if (data.scheduleLines && data.scheduleLines.length > 0 && !data.expectedEndDate) {
    throw new AppError(
      "Expected end date is required when schedule lines are provided",
      400
    );
  }

  const payload: CreateBatchDto = {
    ...data,
    branchId,
    courseId: data.courseId || courseItems[0].courseId,
    courses: courseItems,
    scheduleLines: data.scheduleLines,
  };

  if (!payload.startDate) {
    throw new AppError("Start date is required", 400);
  }

  payload.status = resolveStatusForWrite({
    startDate: payload.startDate,
    expectedEndDate: payload.expectedEndDate || null,
    requestedStatus: data.status,
  });

  const existing = await repository.findAllBatches(user.instituteId, undefined, { search: data.code });
  if (existing.some((b) => b.code.toLowerCase() === data.code.toLowerCase())) {
    throw new AppError(`Batch code '${data.code}' already exists for this institute.`, 400);
  }

  if (payload.scheduleLines && payload.scheduleLines.length > 0) {
    await assertNoFacultyScheduleConflicts({
      instituteId: user.instituteId,
      lines: payload.scheduleLines,
      startDate: payload.startDate,
      expectedEndDate: payload.expectedEndDate,
    });
  }

  const batch = await repository.createBatch(user.instituteId, payload);

  // Bridge schedule lines → ClassSession so faculty dashboard/attendance sees classes immediately.
  if (data.scheduleLines && data.scheduleLines.length > 0) {
    try {
      const sync = await generateClassSessionsFromSchedule(batch.id, user, {});
      return { ...batch, sessionSync: sync };
    } catch (err) {
      logger.warn(
        { err, batchId: batch.id },
        "Batch created but class session sync failed"
      );
      return { ...batch, sessionSync: sessionSyncFailure(err) };
    }
  }

  return batch;
};

export const updateBatch = async (id: string, user: AuthUser, data: UpdateBatchDto) => {
  const existingBatch = await loadBatchForUser(id, user);

  // Branch reassignment is not supported — ignore any client-supplied branchId
  const { branchId: _ignoredBranchId, ...safeData } = data;

  if (safeData.code) {
    const existing = await repository.findAllBatches(user.instituteId, undefined, {
      search: safeData.code,
    });
    if (
      existing.some(
        (b) => b.id !== id && b.code.toLowerCase() === safeData.code!.toLowerCase()
      )
    ) {
      throw new AppError(`Batch code '${safeData.code}' already exists for this institute.`, 400);
    }
  }

  const targetBranchId = existingBatch.branchId;

  if (safeData.scheduleLines && safeData.scheduleLines.length > 0) {
    await validateBatchCourses(
      user.instituteId,
      repository.normalizeBatchCourses(safeData),
      targetBranchId
    );
  } else if (safeData.courses && safeData.courses.length > 0) {
    await validateBatchCourses(
      user.instituteId,
      repository.normalizeBatchCourses(safeData),
      targetBranchId
    );
  } else if (safeData.courseId) {
    await validateBatchCourses(
      user.instituteId,
      [{ courseId: safeData.courseId, facultyId: safeData.facultyId, sequence: 1 }],
      targetBranchId
    );
  }

  if (
    safeData.scheduleLines &&
    safeData.scheduleLines.length > 0 &&
    !safeData.expectedEndDate &&
    !existingBatch.expectedEndDate
  ) {
    throw new AppError(
      "Expected end date is required when schedule lines are provided",
      400
    );
  }

  if (safeData.scheduleLines && safeData.scheduleLines.length > 0) {
    await assertNoFacultyScheduleConflicts({
      instituteId: user.instituteId,
      lines: safeData.scheduleLines,
      startDate: safeData.startDate || existingBatch.startDate,
      expectedEndDate: safeData.expectedEndDate || existingBatch.expectedEndDate,
      excludeBatchId: id,
    });
  }

  const effectiveStart =
    safeData.startDate !== undefined ? safeData.startDate : existingBatch.startDate;
  const effectiveEnd =
    safeData.expectedEndDate !== undefined
      ? safeData.expectedEndDate || null
      : existingBatch.expectedEndDate;

  safeData.status = resolveStatusForWrite({
    startDate: effectiveStart,
    expectedEndDate: effectiveEnd,
    requestedStatus: data.status,
  });

  const result = await repository.updateBatch(id, user.instituteId, safeData);
  if (result.count === 0) {
    throw new AppError("Batch not found", 404);
  }

  // Re-sync upcoming sessions whenever schedule lines are sent (including clearing/disabling Att?).
  if (safeData.scheduleLines !== undefined) {
    try {
      const sync = await generateClassSessionsFromSchedule(id, user, {});
      return { ...result, sessionSync: sync };
    } catch (err) {
      logger.warn({ err, batchId: id }, "Batch updated but class session sync failed");
      return { ...result, sessionSync: sessionSyncFailure(err) };
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

export const getBatchStudents = async (batchId: string, user: AuthUser) => {
  await loadBatchForUser(batchId, user);
  return repository.getBatchStudents(batchId);
};

export const deleteBatch = async (id: string, user: AuthUser) => {
  await loadBatchForUser(id, user);

  const result = await prisma.$transaction(async (tx) => {
    // Admissions retain history; batchId is SetNull on delete via FK.
    return tx.batch.deleteMany({
      where: { id, instituteId: user.instituteId },
    });
  });

  if (result.count === 0) {
    throw new AppError("Batch not found", 404);
  }
  return result;
};

export const getBatchSchedules = async (batchId: string, user: AuthUser) => {
  await loadBatchForUser(batchId, user);
  return repository.findBatchSchedules(batchId, user.instituteId);
};

export const addBatchSchedule = async (
  batchId: string,
  user: AuthUser,
  data: CreateBatchScheduleDto
) => {
  const batch = await loadBatchForUser(batchId, user);
  if (data.status !== "INACTIVE" && data.facultyId) {
    await assertNoFacultyScheduleConflicts({
      instituteId: user.instituteId,
      lines: [
        {
          facultyId: data.facultyId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          timeslotMasterId: data.timeslotMasterId,
          status: data.status || "ACTIVE",
        },
      ],
      startDate: data.effectiveFrom || batch.startDate,
      expectedEndDate: data.effectiveTo || batch.expectedEndDate,
      // Same-batch overlaps must also be rejected when adding a single line.
    });
  }
  const schedule = await repository.createBatchSchedule(batchId, user.instituteId, data);
  if (!schedule) throw new AppError("Failed to create batch schedule", 400);
  try {
    await generateClassSessionsFromSchedule(batchId, user, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule added but class session sync skipped");
  }
  return schedule;
};

export const updateBatchScheduleEntry = async (
  batchId: string,
  scheduleId: string,
  user: AuthUser,
  data: UpdateBatchScheduleDto
) => {
  const batch = await loadBatchForUser(batchId, user);
  const existingSchedules = await repository.findBatchSchedules(batchId, user.instituteId);
  const existing = existingSchedules?.find((s) => s.id === scheduleId);
  if (!existing) throw new AppError("Batch schedule not found", 404);

  const mergedStatus = data.status ?? existing.status;
  const mergedFacultyId =
    data.facultyId !== undefined ? data.facultyId : existing.facultyId;

  if (mergedStatus !== "INACTIVE" && mergedFacultyId) {
    await assertNoFacultyScheduleConflicts({
      instituteId: user.instituteId,
      lines: [
        {
          facultyId: mergedFacultyId,
          dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
          startTime: data.startTime ?? existing.startTime,
          endTime: data.endTime ?? existing.endTime,
          timeslotMasterId:
            data.timeslotMasterId !== undefined
              ? data.timeslotMasterId
              : existing.timeslotMasterId,
          status: mergedStatus,
        },
      ],
      startDate:
        data.effectiveFrom ||
        existing.effectiveFrom ||
        batch.startDate,
      expectedEndDate:
        data.effectiveTo !== undefined
          ? data.effectiveTo
          : existing.effectiveTo || batch.expectedEndDate,
      excludeScheduleId: scheduleId,
    });
  }

  const schedule = await repository.updateBatchSchedule(
    batchId,
    scheduleId,
    user.instituteId,
    data
  );
  if (!schedule) throw new AppError("Batch schedule not found", 404);
  try {
    await generateClassSessionsFromSchedule(batchId, user, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule updated but class session sync skipped");
  }
  return schedule;
};

export const deleteBatchScheduleEntry = async (
  batchId: string,
  scheduleId: string,
  user: AuthUser
) => {
  await loadBatchForUser(batchId, user);
  const deleted = await repository.deleteBatchSchedule(
    batchId,
    scheduleId,
    user.instituteId
  );
  if (!deleted) throw new AppError("Batch schedule not found", 404);
  try {
    await generateClassSessionsFromSchedule(batchId, user, {});
  } catch (err) {
    logger.warn({ err, batchId }, "Schedule deleted but class session sync skipped");
  }
  return deleted;
};

export const generateClassSessionsFromSchedule = async (
  batchId: string,
  user: AuthUser,
  options: GenerateSessionsDto = {}
) => {
  const batch = await loadBatchForUser(batchId, user);
  const coordinatorFacultyId = batch.facultyId;
  const allSchedules = (batch.schedules || []).filter((s) => {
    const status = String((s as { status?: string }).status || "ACTIVE").toUpperCase();
    if (status === "INACTIVE") return false;
    // Att? unchecked → do not create/update attendance class sessions for this line
    if ((s as { attendanceEnabled?: boolean }).attendanceEnabled === false) return false;
    return true;
  });

  const rangeStartKey = formatDateKey(options.startDate || batch.startDate);
  const endSource = options.endDate || batch.expectedEndDate;
  const rangeStart = utcNoonFromDateKey(rangeStartKey);

  // No active Att? lines → cancel upcoming sessions in range so admin/faculty timetables clear.
  if (allSchedules.length === 0) {
    const cancelEndKey = formatDateKey(
      endSource ||
        formatDateKey(
          new Date(utcNoonFromDateKey(rangeStartKey).getTime() + 90 * 24 * 60 * 60 * 1000)
        )
    );
    const cancelEnd = utcNoonFromDateKey(cancelEndKey);
    const cancelledResult = await prisma.classSession.updateMany({
      where: {
        batchId,
        scheduledDate: { gte: rangeStart, lte: cancelEnd },
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
      skippedHolidays: 0,
      skippedConflicts: 0,
      sessions: [],
      message:
        "No active attendance schedule lines. Upcoming class sessions in range were cancelled.",
    };
  }

  if (!endSource) {
    throw new AppError(
      "Expected end date is required to generate class sessions. Set the batch expected end date or pass endDate.",
      400
    );
  }
  const rangeEndKey = formatDateKey(endSource);
  const rangeEnd = utcNoonFromDateKey(rangeEndKey);

  const holidayRecords = await prisma.masterRecord.findMany({
    where: {
      instituteId: user.instituteId,
      entityType: "holiday",
      status: "ACTIVE",
      OR: [{ branchId: null }, { branchId: batch.branchId }],
    },
    select: { data: true },
  });
  const holidayKeys = new Set(
    holidayRecords
      .map((row) => {
        const data = row.data as Record<string, unknown> | null;
        const raw = typeof data?.date === "string" ? data.date.trim() : "";
        const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
        return match?.[1] ?? "";
      })
      .filter(Boolean)
  );

  const scheduleFacultyIds = [
    ...new Set(
      allSchedules
        .map((slot) => {
          const lineFaculty =
            (slot as { facultyId?: string | null }).facultyId ||
            batch.batchCourses?.find((bc) => bc.id === slot.batchCourseId)?.facultyId ||
            coordinatorFacultyId;
          return lineFaculty || null;
        })
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [otherFacultySessions, facultyBlocks] = await Promise.all([
    scheduleFacultyIds.length === 0
      ? Promise.resolve([])
      : prisma.classSession.findMany({
          where: {
            facultyId: { in: scheduleFacultyIds },
            batchId: { not: batchId },
            status: "ACTIVE",
            sessionStatus: { not: "CANCELLED" },
            scheduledDate: { gte: rangeStart, lte: rangeEnd },
            batch: { instituteId: user.instituteId },
          },
          select: {
            facultyId: true,
            scheduledDate: true,
            startTime: true,
            endTime: true,
          },
        }),
    scheduleFacultyIds.length === 0
      ? Promise.resolve([])
      : prisma.facultyScheduleBlock.findMany({
          where: {
            instituteId: user.instituteId,
            facultyId: { in: scheduleFacultyIds },
            scheduledDate: { gte: rangeStart, lte: rangeEnd },
          },
          select: {
            facultyId: true,
            scheduledDate: true,
            startTime: true,
            endTime: true,
          },
        }),
  ]);

  const facultyBusyKeys = new Set(
    [
      ...otherFacultySessions.map(
        (s) =>
          `${s.facultyId}|${formatDateKey(s.scheduledDate)}|${s.startTime}|${s.endTime}`
      ),
      ...facultyBlocks.map(
        (b) =>
          `${b.facultyId}|${formatDateKey(b.scheduledDate)}|${b.startTime}|${b.endTime}`
      ),
    ]
  );

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
  let skippedHolidays = 0;
  let skippedConflicts = 0;

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

    if (holidayKeys.has(dateKey)) {
      skippedHolidays += matchingSlots.length;
      continue;
    }

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

      const busyKey = `${lineFaculty}|${dateKey}|${slot.startTime}|${slot.endTime}`;
      if (facultyBusyKeys.has(busyKey)) {
        skippedConflicts += 1;
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
      // Prevent double-booking the same faculty within this generation pass
      facultyBusyKeys.add(busyKey);
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
  // Holiday dates are intentionally unmatched so those UPCOMING orphans are cancelled.
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

  const skipped = skippedHolidays + skippedConflicts;
  const endLabel = rangeEndKey;
  const parts = [
    `${toCreate.length} created`,
    `${toUpdate.length} updated`,
    cancelled ? `${cancelled} cancelled` : null,
    skippedHolidays ? `${skippedHolidays} skipped (holidays)` : null,
    skippedConflicts ? `${skippedConflicts} skipped (conflicts)` : null,
  ].filter(Boolean);

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    cancelled,
    skipped,
    skippedHolidays,
    skippedConflicts,
    sessions: createdSessions,
    message: `Timetable filled through ${endLabel}: ${parts.join(", ")}.`,
  };
};

export const getAvailableFaculty = async (
  user: AuthUser,
  query: import("./batch.types").AvailableFacultyQuery
) => {
  if (isBranchLockedRole(user.roles)) {
    const allowed = user.allowedBranchIds ?? [];
    if (allowed.length === 0 && !user.branchId) {
      return [];
    }
  }

  const scope = getBranchScopeFilter(user, query.branchId);
  return repository.findAvailableFaculty(user.instituteId, {
    ...query,
    branchId: scope.branchId,
    branchIds: scope.branchIds,
  });
};
