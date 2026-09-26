import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { assertPasswordMeetsInstitutePolicy } from "../../utils/password-policy.util";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { SequenceService } from "../masters/sequence.service";
import { buildMeta } from "../../utils/pagination";
import {
  assertBranchRecordAccess,
  getBranchScopeFilter,
} from "../../utils/branch-isolation.util";
import {
  assertFacultyCanAccessStudent,
  assertFacultyOwnsBatch,
  getFacultyTeachingBatchIds,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
  resolveFacultyIdForUser,
} from "../../utils/auth-user.util";
import { prisma } from "../../config/database";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./faculty.repository";
import * as facultyAllocationService from "./faculty-allocation.service";
import * as batchCurriculumService from "../batches/batch-curriculum.service";
import {
  formatBatchSubjectNames,
  getSessionSubjectLabel,
} from "../../utils/batch-course.util";
import {
  getSessionHostPhase,
  istTodayKey,
} from "../../utils/session-window.util";
import type {
  CreateFacultyDto,
  UpdateFacultyDto,
  ListFacultyQuery,
  MyStudentsQuery,
  MyStudentAttendanceQuery,
  MarkAttendanceDto,
  BulkDailyAttendanceDto,
  DailyAttendanceQuery,
  FacultyDailyAttendanceStatus,
  FacultySelfAttendanceGeoDto,
  FacultyCheckOutDto,
} from "./faculty.validation";
import {
  facultyDayKey,
  groupPunchesByFacultyDay,
  istWallTimeToDate,
  summarizeDayPunches,
  toPunchDto,
  type FacultyPunchRow,
  type FacultyPunchSource,
  type FacultyPunchType,
} from "./faculty-attendance-punch.util";

// ─── Geofencing constants & helpers ─────────────────────────────────────

const FACULTY_GEOFENCE_RADIUS_M = 100;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function getISTDateString(now: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getISTTimeString(now: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(11, 16); // HH:mm
}

const toCalendarDateKey = (value: Date | string): string => {
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
    }
    return value.slice(0, 10);
  }
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
};

/** Institute "today" as YYYY-MM-DD in Asia/Kolkata. */
const localTodayKey = (): string => istTodayKey();

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

/** Inclusive UTC bounds for a calendar YYYY-MM-DD (covers noon- and midnight-stored dates). */
const dateKeyToUtcDayStart = (dateKey: string): Date => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

const dateKeyToUtcDayEnd = (dateKey: string): Date => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
};

const mapSessionCard = (s: Awaited<ReturnType<typeof repo.findFacultySessionsInRange>>[number]) => {
  const todayKey = localTodayKey();
  const sessionKey = toCalendarDateKey(s.scheduledDate);
  const isToday = sessionKey === todayKey;

  let derivedStatus = (s.sessionStatus || "UPCOMING").toUpperCase();
  if (derivedStatus === "CANCELLED") {
    // keep cancelled
  } else if (derivedStatus === "COMPLETED") {
    // keep completed
  } else {
    const phase = getSessionHostPhase({
      dateKey: sessionKey,
      startTime: s.startTime,
      endTime: s.endTime,
    });
    if (phase === "after") {
      derivedStatus = "COMPLETED";
    } else if (derivedStatus === "LIVE" && phase === "during") {
      derivedStatus = "LIVE";
    } else if (derivedStatus !== "LIVE") {
      if (s.actualEndTime) derivedStatus = "COMPLETED";
      else if (isToday || sessionKey > todayKey) derivedStatus = "UPCOMING";
      else if (sessionKey < todayKey) derivedStatus = "COMPLETED";
      else derivedStatus = "UPCOMING";
    }
  }

  return {
    id: s.id,
    title: s.title,
    courseName: getSessionSubjectLabel({ title: s.title, batch: s.batch }),
    courseCode: s.batch?.course?.code ?? null,
    subjectName: s.batchModule?.courseModule?.name ?? s.title,
    batchId: s.batch?.id ?? null,
    batchName: s.batch?.name ?? null,
    batchCode: s.batch?.code ?? null,
    scheduledDate: sessionKey,
    startTime: s.startTime,
    endTime: s.endTime,
    roomNo: s.roomNo ?? s.classroomMaster?.name ?? null,
    mode: s.mode,
    meetingUrl: s.meetingUrl,
    sessionStatus: derivedStatus,
    assignedStudents: s.batch?._count?.enrollments ?? 0,
  };
};

/**
 * List faculty with pagination, search, and optional branch isolation.
 * Pure FACULTY users only see themselves.
 */
export const getAllFaculty = async (currentUser: AuthUser, query: ListFacultyQuery) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  if (isPureFaculty(currentUser.roles)) {
    const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
    const faculty = await repo.findFacultyById(facultyId!);
    const data = faculty ? [faculty] : [];
    return { data, meta: buildMeta(data.length, page, limit) };
  }

  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const params: repo.FindAllFacultyParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    branchIds: scope.branchIds,
    search: query.search || undefined,
    status: query.status || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findAllFaculty(params),
    repo.countFaculty({
      instituteId: params.instituteId,
      branchId: params.branchId,
      branchIds: params.branchIds,
      search: params.search,
      status: params.status,
    }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

/**
 * Get a single faculty member by ID (self-only for pure FACULTY).
 */
export const getFacultyById = async (currentUser: AuthUser, id: string) => {
  if (isPureFaculty(currentUser.roles)) {
    const ownId = await requireFacultyIdIfPureFaculty(currentUser);
    if (ownId !== id) {
      throw new AppError("You can only view your own faculty profile", 403);
    }
  }

  const faculty = await repo.findFacultyById(id);
  if (!faculty) throw new AppError("Faculty not found", 404);

  if (!isPureFaculty(currentUser.roles)) {
    assertBranchRecordAccess(currentUser, faculty.branchId, "Faculty not found");
  }

  const curriculumProgress = await batchCurriculumService.getFacultyCurriculumProgress(
    faculty.id,
    faculty.instituteId
  );

  return { ...faculty, curriculumProgress };
};

/**
 * Create a new faculty member (User + Faculty + FACULTY role).
 * Employee code is auto-generated from Master Setup EMPLOYEE numbering series when omitted.
 */
export const createFaculty = async (instituteId: string, dto: CreateFacultyDto) => {
  const branch = await prisma.branch.findFirst({
    where: { id: dto.branchId, instituteId },
  });
  if (!branch) {
    throw new AppError("Selected branch not found or does not belong to this institute", 400);
  }

  let employeeCode = dto.employeeCode?.trim();
  const sequenceContext = { branchCode: branch.code };
  const shouldAutoGenerate =
    !employeeCode ||
    (await SequenceService.matchesNextPreview(instituteId, "EMPLOYEE", employeeCode, sequenceContext));

  if (shouldAutoGenerate) {
    // Consume sequence until unique (handles collisions with seeded/manual codes).
    for (let attempt = 0; attempt < 20; attempt++) {
      employeeCode = await SequenceService.getNextNumber(instituteId, "EMPLOYEE", sequenceContext);
      const taken = await repo.findFacultyByEmployeeCode(instituteId, employeeCode);
      if (!taken) break;
      if (attempt === 19) {
        throw new AppError(
          "Unable to generate a unique employee code. Check EMPLOYEE numbering series in Master Setup.",
          500
        );
      }
    }
  } else {
    const existing = await repo.findFacultyByEmployeeCode(instituteId, employeeCode!);
    if (existing) {
      throw new AppError(`Employee code '${employeeCode}' already exists`, 409);
    }
  }

  await assertPasswordMeetsInstitutePolicy(instituteId, dto.password);
  const passwordHash = await hashPassword(dto.password);
  let designation: string | undefined;
  let designationMasterId: string | undefined;
  if (dto.designationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "designation",
      masterRecordId: dto.designationMasterId,
      branchId: dto.branchId,
    });
    designationMasterId = resolved?.masterId;
    designation = resolved?.label ?? dto.designation;
  } else if (dto.designation) {
    designation = dto.designation;
  }

  let qualification: string | undefined;
  let qualificationMasterId: string | undefined;
  if (dto.qualificationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "education",
      masterRecordId: dto.qualificationMasterId,
      branchId: dto.branchId,
    });
    qualificationMasterId = resolved?.masterId;
    qualification = resolved?.label;
  }

  return repo.createFacultyWithUser({
    instituteId,
    branchId: dto.branchId,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    passwordHash,
    employeeCode: employeeCode!,
    specialization: dto.specialization,
    designation,
    designationMasterId,
    qualification,
    qualificationMasterId,
    workLatitude: dto.workLatitude ?? null,
    workLongitude: dto.workLongitude ?? null,
  });
};

/**
 * Update a faculty member's details (including designation/qualification).
 */
export const updateFaculty = async (
  currentUser: AuthUser,
  id: string,
  dto: UpdateFacultyDto
) => {
  const existing = await getFacultyById(currentUser, id);

  let designation: string | null | undefined = dto.designation;
  let designationMasterId: string | null | undefined = dto.designationMasterId;
  let qualification: string | null | undefined = undefined;
  let qualificationMasterId: string | null | undefined = dto.qualificationMasterId;

  if (dto.designationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId: existing.instituteId,
      entityType: "designation",
      masterRecordId: dto.designationMasterId,
      branchId: existing.branchId,
    });
    designationMasterId = resolved?.masterId ?? null;
    designation = resolved?.label ?? dto.designation ?? null;
  } else if (dto.designationMasterId === null) {
    designationMasterId = null;
    designation = null;
  }

  if (dto.qualificationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId: existing.instituteId,
      entityType: "education",
      masterRecordId: dto.qualificationMasterId,
      branchId: existing.branchId,
    });
    qualificationMasterId = resolved?.masterId ?? null;
    qualification = resolved?.label ?? null;
  } else if (dto.qualificationMasterId === null) {
    qualificationMasterId = null;
    qualification = null;
  }

  return repo.updateFaculty(id, {
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    specialization: dto.specialization,
    designation: designation === undefined ? undefined : designation,
    designationMasterId:
      designationMasterId === undefined ? undefined : designationMasterId,
    qualification: qualification === undefined ? undefined : qualification,
    qualificationMasterId:
      qualificationMasterId === undefined ? undefined : qualificationMasterId,
    status: dto.status,
    workLatitude: dto.workLatitude !== undefined ? dto.workLatitude : undefined,
    workLongitude: dto.workLongitude !== undefined ? dto.workLongitude : undefined,
  });
};

/**
 * Permanently delete a faculty member (hard delete).
 */
export const deleteFaculty = async (currentUser: AuthUser, id: string) => {
  await getFacultyById(currentUser, id);
  const result = await repo.hardDeleteFaculty(id);
  if (!result) throw new AppError("Faculty not found", 404);
  return result;
};

// ─── Faculty Course Assignments ─────────────────────────────────────────

export const getAllFacultyCourses = async (
  currentUser: AuthUser,
  query: { page?: number; limit?: number; facultyId?: string; branchId?: string }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  let targetFacultyId = query.facultyId && query.facultyId !== "ALL" ? query.facultyId : undefined;

  if (isPureFaculty(currentUser.roles)) {
    targetFacultyId = (await requireFacultyIdIfPureFaculty(currentUser))!;
  }

  const params: repo.FindFacultyCoursesParams = {
    instituteId: scope.instituteId,
    // Pure faculty teaching desk may cross branches
    branchId: targetFacultyId && isPureFaculty(currentUser.roles) ? undefined : scope.branchId,
    facultyId: targetFacultyId,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findFacultyCourses(params),
    repo.countFacultyCourses({
      instituteId: params.instituteId,
      branchId: params.branchId,
      facultyId: params.facultyId,
    }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

export const assignFacultyToBatch = async (
  currentUser: AuthUser,
  batchId: string,
  facultyId: string,
  courseId?: string
) => {
  return facultyAllocationService.assignFacultyToBatch(currentUser, batchId, facultyId, courseId);
};

// ─── Faculty Attendance ─────────────────────────────────────────────────

export const getAllFacultyAttendance = async (
  currentUser: AuthUser,
  query: { page?: number; limit?: number; facultyId?: string; branchId?: string; date?: string }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  let facultyId = query.facultyId || undefined;
  if (isPureFaculty(currentUser.roles)) {
    facultyId = (await requireFacultyIdIfPureFaculty(currentUser))!;
  }

  const params: repo.FindFacultyAttendanceParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    facultyId,
    date: query.date || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findFacultyAttendance(params),
    repo.countFacultyAttendance({
      instituteId: params.instituteId,
      branchId: params.branchId,
      facultyId: params.facultyId,
      date: params.date,
    }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

export const logFacultyAttendance = async (
  currentUser: AuthUser,
  data: MarkAttendanceDto
) => {
  let facultyId = data.facultyId;
  if (isPureFaculty(currentUser.roles)) {
    facultyId = (await requireFacultyIdIfPureFaculty(currentUser))!;
  }
  if (!facultyId) {
    throw new AppError("Faculty ID is required", 400);
  }

  const faculty = await repo.findFacultyById(facultyId);
  if (!faculty || faculty.instituteId !== currentUser.instituteId) {
    throw new AppError("Faculty not found", 404);
  }

  const session = await prisma.classSession.findFirst({
    where: {
      id: data.classSessionId,
      batch: { instituteId: currentUser.instituteId },
    },
    select: { id: true, facultyId: true, batchId: true, branchId: true },
  });
  if (!session) {
    throw new AppError("Class session not found", 404);
  }

  return repo.upsertFacultyAttendance({
    facultyId,
    classSessionId: data.classSessionId,
    loginAt: data.loginAt ? new Date(data.loginAt) : undefined,
    logoutAt: data.logoutAt ? new Date(data.logoutAt) : undefined,
  });
};

// ─── Faculty Daily Attendance (desk) ────────────────────────────────────

const normalizeDailyRecord = (
  status: FacultyDailyAttendanceStatus,
  inTime?: string | null,
  outTime?: string | null,
  comments?: string | null
) => {
  if (status === "PRESENT") {
    const normalizedIn = inTime || null;
    const normalizedOut = outTime || null;
    if (normalizedOut && !normalizedIn) {
      throw new AppError("inTime is required when outTime is set", 400);
    }
    if (normalizedIn && normalizedOut && normalizedOut <= normalizedIn) {
      throw new AppError("Logout time must be after login time", 400);
    }
    return {
      status,
      inTime: normalizedIn,
      outTime: normalizedOut,
      comments: comments ?? null,
    };
  }
  return {
    status,
    inTime: null,
    outTime: null,
    comments: comments ?? null,
  };
};

/**
 * GET desk attendance for a date: all in-scope faculty + that day's record (or null).
 * Pure faculty may only fetch their own records (use facultyId or from/to range).
 */
export const getDailyAttendance = async (
  currentUser: AuthUser,
  query: DailyAttendanceQuery
) => {
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  let facultyId = query.facultyId || undefined;
  if (isPureFaculty(currentUser.roles)) {
    facultyId = (await requireFacultyIdIfPureFaculty(currentUser))!;
  }

  // History mode: facultyId + optional from/to (no single date desk list)
  if (facultyId && !query.date) {
    const from = query.from ? repo.parseDateOnly(query.from) : undefined;
    const to = query.to ? repo.parseDateOnly(query.to) : undefined;
    const faculty = await repo.findFacultyById(facultyId);
    if (!faculty || faculty.instituteId !== currentUser.instituteId) {
      throw new AppError("Faculty not found", 404);
    }
    if (
      scope.branchId &&
      faculty.branchId !== scope.branchId &&
      !isPureFaculty(currentUser.roles)
    ) {
      throw new AppError("Faculty not found", 404);
    }

    const [records, punchRows] = await Promise.all([
      repo.findDailyAttendanceForFaculty({ facultyId, from, to }),
      repo.findPunchesForFacultyRange({ facultyId, from, to }),
    ]);
    const punchesByDay = groupPunchesByFacultyDay(punchRows);
    const present = records.filter((r) => r.status === "PRESENT").length;
    const counted = records.filter((r) =>
      r.status === "PRESENT" || r.status === "ABSENT" || r.status === "LEAVE"
    ).length;
    const attendancePct = counted > 0 ? Math.round((present / counted) * 100) : 0;

    return {
      mode: "history" as const,
      facultyId,
      attendancePct,
      records: records.map((r) => {
        const dateKey = r.date.toISOString().slice(0, 10);
        return {
          id: r.id,
          facultyId: r.facultyId,
          date: dateKey,
          status: r.status,
          inTime: r.inTime,
          outTime: r.outTime,
          comments: r.comments,
          markedBy: r.markedBy,
          updatedAt: r.updatedAt.toISOString(),
          ...summarizeDayPunches(punchesByDay.get(facultyDayKey(r.facultyId, dateKey)) ?? [], r),
        };
      }),
    };
  }

  if (!query.date) {
    throw new AppError("date (YYYY-MM-DD) is required", 400);
  }

  const date = repo.parseDateOnly(query.date);
  const [facultyList, attendanceRows] = await Promise.all([
    repo.findFacultyForDailyAttendance({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      facultyId,
    }),
    repo.findDailyAttendanceByDate({
      instituteId: scope.instituteId,
      branchId: scope.branchId,
      facultyId,
      date,
    }),
  ]);

  const attendanceByFaculty = new Map(attendanceRows.map((r) => [r.facultyId, r]));
  const punchRows = await repo.findPunchesForFacultiesOnDate(
    attendanceRows.map((r) => r.facultyId),
    date
  );
  const punchesByDay = groupPunchesByFacultyDay(punchRows);

  const records = facultyList.map((f) => {
    const att = attendanceByFaculty.get(f.id);
    return {
      facultyId: f.id,
      employeeCode: f.employeeCode,
      designation: f.designation,
      specialization: f.specialization,
      status: f.status,
      user: f.user,
      branch: f.branch,
      attendance: att
        ? {
            id: att.id,
            date: query.date!,
            status: att.status,
            inTime: att.inTime,
            outTime: att.outTime,
            comments: att.comments,
            markedBy: att.markedBy,
            updatedAt: att.updatedAt.toISOString(),
            ...summarizeDayPunches(punchesByDay.get(facultyDayKey(f.id, query.date!)) ?? [], att),
          }
        : null,
    };
  });

  return {
    mode: "desk" as const,
    date: query.date,
    records,
  };
};

export const saveDailyAttendance = async (
  currentUser: AuthUser,
  dto: BulkDailyAttendanceDto
) => {
  if (isPureFaculty(currentUser.roles)) {
    throw new AppError("Faculty cannot bulk-mark daily attendance", 403);
  }

  const scope = getBranchScopeFilter(currentUser);
  const date = repo.parseDateOnly(dto.date);
  const facultyIds = [...new Set(dto.records.map((r) => r.facultyId))];

  const facultyRows = await prisma.faculty.findMany({
    where: {
      id: { in: facultyIds },
      instituteId: currentUser.instituteId,
      ...(scope.branchId ? { branchId: scope.branchId } : {}),
    },
    select: { id: true, branchId: true, status: true },
  });

  if (facultyRows.length !== facultyIds.length) {
    throw new AppError("One or more faculty members were not found or are out of scope", 400);
  }

  const inactive = facultyRows.filter((f) => f.status === "INACTIVE");
  if (inactive.length > 0) {
    throw new AppError("Cannot mark attendance for inactive faculty", 400);
  }

  // Preserve existing geo check-in/out times when admin re-saves Present without times.
  const existingRows = await prisma.facultyDailyAttendance.findMany({
    where: {
      date,
      facultyId: { in: facultyIds },
    },
    select: { facultyId: true, inTime: true, outTime: true },
  });
  const existingByFaculty = new Map(existingRows.map((r) => [r.facultyId, r]));

  const normalized = dto.records.map((r) => {
    let inTime = r.inTime ?? null;
    let outTime = r.outTime ?? null;

    if (r.status === "PRESENT") {
      const existing = existingByFaculty.get(r.facultyId);
      if (!inTime && existing?.inTime) inTime = existing.inTime;
      if (!outTime && existing?.outTime) outTime = existing.outTime;
    }

    const n = normalizeDailyRecord(r.status, inTime, outTime, r.comments);
    return {
      facultyId: r.facultyId,
      status: n.status,
      inTime: n.inTime,
      outTime: n.outTime,
      comments: n.comments,
      markedBy: currentUser.id,
    };
  });

  const saved = await repo.bulkUpsertDailyAttendance(date, normalized);

  return {
    date: dto.date,
    savedCount: saved.length,
    records: saved.map((r) => ({
      id: r.id,
      facultyId: r.facultyId,
      date: dto.date,
      status: r.status,
      inTime: r.inTime,
      outTime: r.outTime,
      comments: r.comments,
    })),
  };
};

// ─── Personal Dashboard ─────────────────────────────────────────────────

export const getMyDashboard = async (currentUser: AuthUser) => {
  let facultyId = currentUser.facultyId ?? null;
  if (!facultyId) {
    facultyId = await resolveFacultyIdForUser(currentUser.id);
  }
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }

  // Non-pure roles may only view their own dashboard if they have a faculty profile;
  // admins opening this endpoint still get their linked faculty profile if any.
  if (isPureFaculty(currentUser.roles) && facultyId) {
    // already scoped to self
  }

  const faculty = await repo.findFacultyById(facultyId);
  if (!faculty) throw new AppError("Faculty not found", 404);

  const todayKey = localTodayKey();
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const upcomingEndKey = addDaysToDateKey(todayKey, 14);
  // Monday–Sunday of the current IST week (matches admin Timetable week)
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const jsDay = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0)).getUTCDay(); // 0 Sun … 6 Sat
  const daysSinceMonday = (jsDay + 6) % 7;
  const weekStartKey = addDaysToDateKey(todayKey, -daysSinceMonday);
  const weekEndKey = addDaysToDateKey(weekStartKey, 6);

  const monthStartKey = `${ty}-${String(tm).padStart(2, "0")}-01`;
  const monthLastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const monthEndKey = `${ty}-${String(tm).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`;

  // One continuous window: current week start → next 14 days (covers admin-assigned week + upcoming)
  const scheduleFrom = dateKeyToUtcDayStart(weekStartKey);
  const scheduleTo = dateKeyToUtcDayEnd(
    upcomingEndKey > weekEndKey ? upcomingEndKey : weekEndKey
  );

  const [
    scheduledRaw,
    statusCounts,
    myBatches,
    recentFeedback,
    pendingGrading,
    pendingSubmissions,
    ratingStats,
    monthAttendanceRows,
    todayPunches,
  ] = await Promise.all([
    repo.findFacultySessionsInRange(facultyId, scheduleFrom, scheduleTo),
    repo.countFacultySessionsByStatus(
      facultyId,
      dateKeyToUtcDayStart(weekStartKey),
      dateKeyToUtcDayEnd(weekEndKey)
    ),
    repo.findFacultyBatchesSummary(facultyId),
    repo.findRecentFacultyFeedback(facultyId, 5),
    repo.findPendingGrading(facultyId, 10),
    repo.countPendingSubmissions(facultyId),
    repo.getFacultyAvgRating(facultyId),
    repo.findDailyAttendanceForFaculty({
      facultyId,
      from: repo.parseDateOnly(monthStartKey),
      to: repo.parseDateOnly(monthEndKey),
    }),
    repo.findPunchesForFacultiesOnDate([facultyId], repo.parseDateOnly(todayKey)),
  ]);

  const allScheduled = scheduledRaw.map(mapSessionCard);
  const todaySessions = allScheduled.filter((s) => s.scheduledDate === todayKey);
  const upcomingSessions = allScheduled.filter(
    (s) => s.scheduledDate >= tomorrowKey && s.scheduledDate <= upcomingEndKey
  );
  const weekSessions = allScheduled.filter(
    (s) => s.scheduledDate >= weekStartKey && s.scheduledDate <= weekEndKey
  );

  const liveFromToday = todaySessions.filter((s) => s.sessionStatus === "LIVE").length;

  const todayAttendanceRow = monthAttendanceRows.find(
    (r) => toCalendarDateKey(r.date) === todayKey
  );
  const monthPresent = monthAttendanceRows.filter((r) => r.status === "PRESENT").length;
  const monthCounted = monthAttendanceRows.filter(
    (r) => r.status === "PRESENT" || r.status === "ABSENT" || r.status === "LEAVE"
  ).length;
  const monthPct = monthCounted > 0 ? Math.round((monthPresent / monthCounted) * 100) : 0;

  return {
    profile: {
      id: faculty.id,
      employeeCode: faculty.employeeCode,
      name: faculty.user?.name ?? null,
      email: faculty.user?.email ?? null,
      phone: faculty.user?.phone ?? null,
      specialization: faculty.specialization,
      designation: faculty.designation,
      qualification: faculty.qualification,
      status: faculty.status,
      branch: faculty.branch,
      workLatitude: faculty.workLatitude,
      workLongitude: faculty.workLongitude,
    },
    counts: {
      todayClasses: todaySessions.length,
      upcomingClasses: upcomingSessions.length,
      weekClasses: weekSessions.length,
      liveClasses: Math.max(statusCounts.live, liveFromToday),
      completedThisWeek: weekSessions.filter((s) => s.sessionStatus === "COMPLETED").length,
      pendingSubmissions,
      avgRating: ratingStats.avgRating,
      totalRatings: ratingStats.totalRatings,
    },
    dailyAttendance: {
      today: todayAttendanceRow
        ? {
            status: todayAttendanceRow.status,
            inTime: todayAttendanceRow.inTime,
            outTime: todayAttendanceRow.outTime,
            comments: todayAttendanceRow.comments,
            ...summarizeDayPunches(todayPunches, todayAttendanceRow),
          }
        : null,
      monthPct,
    },
    todaySessions,
    upcomingSessions,
    weekSessions,
    /** Flat list used by faculty Scheduled Classes UI (week + upcoming window). */
    scheduledSessions: allScheduled,
    myBatches: myBatches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      status: b.status,
      courseName: formatBatchSubjectNames(b),
      courseCode: b.course?.code ?? null,
      studentCount: b._count.enrollments,
    })),
    recentFeedback: recentFeedback.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      submittedAt: f.submittedAt,
      studentName: "Anonymous student",
      batchName: f.classSession?.batch?.name ?? null,
      sessionTitle: f.classSession?.title ?? null,
    })),
    pendingGrading,
  };
};

export const getMyStudents = async (currentUser: AuthUser, query: MyStudentsQuery) => {
  let facultyId = currentUser.facultyId ?? null;
  if (!facultyId) {
    facultyId = await resolveFacultyIdForUser(currentUser.id);
  }
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }

  if (isPureFaculty(currentUser.roles)) {
    const ownId = await requireFacultyIdIfPureFaculty(currentUser);
    facultyId = ownId!;
  }

  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const { data, total } = await repo.findMyStudents({
    facultyId,
    instituteId: currentUser.instituteId,
    batchId: query.batchId,
    search: query.search,
    skip,
    take: limit,
  });

  const { computeStudentAttendanceSummaries } = await import(
    "../attendance/attendance-stats.util"
  );
  const summaries = await computeStudentAttendanceSummaries(data.map((s) => s.id));

  const enriched = data.map((s) => {
    const stats = summaries.get(s.id);
    return {
      ...s,
      presentCount: stats?.presentCount ?? 0,
      conductedCount: stats?.conductedCount ?? 0,
      attendancePercentage: stats?.attendancePercentage ?? 0,
    };
  });

  return { data: enriched, meta: buildMeta(total, page, limit) };
};

/**
 * Teaching-desk student class attendance history for the logged-in faculty.
 */
export const getMyStudentAttendance = async (
  currentUser: AuthUser,
  query: MyStudentAttendanceQuery
) => {
  let facultyId = currentUser.facultyId ?? null;
  if (!facultyId) {
    facultyId = await resolveFacultyIdForUser(currentUser.id);
  }
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }
  if (isPureFaculty(currentUser.roles)) {
    facultyId = (await requireFacultyIdIfPureFaculty(currentUser))!;
  }

  if (query.batchId) {
    await assertFacultyOwnsBatch(currentUser, query.batchId);
  }
  if (query.studentId) {
    await assertFacultyCanAccessStudent(currentUser, query.studentId);
  }

  const teachingBatchIds = await getFacultyTeachingBatchIds(
    facultyId,
    currentUser.instituteId
  );

  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (query.month) {
    const [y, m] = query.month.split("-").map(Number);
    fromDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    toDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  } else {
    if (query.fromDate) fromDate = new Date(`${query.fromDate}T00:00:00.000Z`);
    if (query.toDate) toDate = new Date(`${query.toDate}T23:59:59.999Z`);
  }

  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const { records, total, allForAggregation } = await repo.findMyStudentAttendance({
    facultyId,
    instituteId: currentUser.instituteId,
    batchIds: teachingBatchIds,
    batchId: query.batchId,
    studentId: query.studentId,
    search: query.search,
    fromDate,
    toDate,
    skip,
    take: limit,
  });

  const mappedRecords = records.map((r) => {
    const course =
      r.classSession.batchCourse?.course || r.classSession.batch?.course || null;
    return {
      id: r.id,
      status: r.status,
      markedAt: r.markedAt,
      studentId: r.student.id,
      studentCode: r.student.studentCode,
      studentName: r.student.user?.name ?? r.student.studentCode,
      sessionId: r.classSession.id,
      sessionTitle: r.classSession.title,
      date: toCalendarDateKey(r.classSession.scheduledDate),
      startTime: r.classSession.startTime,
      endTime: r.classSession.endTime,
      batchId: r.classSession.batch?.id ?? r.classSession.batchId,
      batchName: r.classSession.batch?.name ?? null,
      batchCode: r.classSession.batch?.code ?? null,
      courseId: course?.id ?? null,
      courseName: course?.name ?? null,
      courseCode: course?.code ?? null,
    };
  });

  const calendar: Record<
    string,
    { present: number; absent: number; leave: number; total: number }
  > = {};
  let present = 0;
  let absent = 0;
  let leave = 0;

  const byStudent = new Map<
    string,
    {
      studentId: string;
      studentCode: string;
      studentName: string;
      present: number;
      absent: number;
      leave: number;
      total: number;
      batchCodes: string[];
    }
  >();

  const addBatchCode = (sid: string, code: string | null | undefined) => {
    const row = byStudent.get(sid);
    if (!row || !code) return;
    if (!row.batchCodes.includes(code)) row.batchCodes.push(code);
  };

  for (const row of allForAggregation) {
    const day = toCalendarDateKey(row.classSession.scheduledDate);
    if (!calendar[day]) {
      calendar[day] = { present: 0, absent: 0, leave: 0, total: 0 };
    }
    calendar[day].total += 1;
    const status = String(row.status).toUpperCase();
    if (status === "PRESENT") {
      calendar[day].present += 1;
      present += 1;
    } else if (status === "ABSENT") {
      calendar[day].absent += 1;
      absent += 1;
    } else if (status === "LEAVE") {
      calendar[day].leave += 1;
      leave += 1;
    }

    const sid = row.studentId;
    const existing = byStudent.get(sid);
    if (!existing) {
      byStudent.set(sid, {
        studentId: sid,
        studentCode: row.student.studentCode,
        studentName: row.student.user?.name ?? row.student.studentCode,
        present: status === "PRESENT" ? 1 : 0,
        absent: status === "ABSENT" ? 1 : 0,
        leave: status === "LEAVE" ? 1 : 0,
        total: 1,
        batchCodes: [],
      });
    } else {
      existing.total += 1;
      if (status === "PRESENT") existing.present += 1;
      else if (status === "ABSENT") existing.absent += 1;
      else if (status === "LEAVE") existing.leave += 1;
    }
    addBatchCode(
      sid,
      (row.classSession as { batch?: { code?: string } | null }).batch?.code
    );
  }

  const effectiveBatchIdsForStats = query.batchId
    ? teachingBatchIds.filter((id) => id === query.batchId)
    : teachingBatchIds;

  // Union ACTIVE enrollments so By Student is not blank when nothing is marked yet.
  if (effectiveBatchIdsForStats.length > 0) {
    const enrollments = await prisma.batchEnrollment.findMany({
      where: {
        status: "ACTIVE",
        batchId: { in: effectiveBatchIdsForStats },
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.search
          ? {
              student: {
                OR: [
                  { studentCode: { contains: query.search, mode: "insensitive" } },
                  { user: { name: { contains: query.search, mode: "insensitive" } } },
                ],
              },
            }
          : {}),
      },
      select: {
        studentId: true,
        batch: { select: { code: true } },
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    for (const e of enrollments) {
      if (!byStudent.has(e.studentId)) {
        byStudent.set(e.studentId, {
          studentId: e.student.id,
          studentCode: e.student.studentCode,
          studentName: e.student.user?.name ?? e.student.studentCode,
          present: 0,
          absent: 0,
          leave: 0,
          total: 0,
          batchCodes: e.batch.code ? [e.batch.code] : [],
        });
      } else {
        addBatchCode(e.studentId, e.batch.code);
      }
    }
  }

  const totalMarks = present + absent + leave;
  const studentIds = Array.from(byStudent.keys());
  const { computeStudentAttendanceSummaries } = await import(
    "../attendance/attendance-stats.util"
  );
  const conductedSummaries = await computeStudentAttendanceSummaries(studentIds, {
    batchIds: effectiveBatchIdsForStats,
  });

  const students = Array.from(byStudent.values())
    .map((s) => {
      const conducted = conductedSummaries.get(s.studentId);
      if (conducted) {
        return {
          studentId: s.studentId,
          studentCode: s.studentCode,
          studentName: s.studentName,
          present: conducted.presentCount,
          absent: conducted.absentCount,
          leave: conducted.leaveCount,
          total: conducted.conductedCount,
          attendancePercentage: conducted.attendancePercentage,
          batchCodes: s.batchCodes,
        };
      }
      return {
        studentId: s.studentId,
        studentCode: s.studentCode,
        studentName: s.studentName,
        present: s.present,
        absent: s.absent,
        leave: s.leave,
        total: s.total,
        attendancePercentage:
          s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0,
        batchCodes: s.batchCodes,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const overallPresent = students.reduce((sum, s) => sum + s.present, 0);
  const overallAbsent = students.reduce((sum, s) => sum + s.absent, 0);
  const overallLeave = students.reduce((sum, s) => sum + s.leave, 0);
  const overallConducted = students.reduce((sum, s) => sum + s.total, 0);

  return {
    data: {
      records: mappedRecords,
      students,
      calendar,
      summary: {
        present: overallPresent || present,
        absent: overallAbsent || absent,
        leave: overallLeave || leave,
        total: overallConducted || totalMarks,
        overallPercentage:
          overallConducted > 0
            ? Math.round((overallPresent / overallConducted) * 10000) / 100
            : totalMarks > 0
              ? Math.round((present / totalMarks) * 10000) / 100
              : 0,
      },
    },
    meta: buildMeta(total, page, limit),
  };
};

// ─── Geofenced Self Check-In / Check-Out ────────────────────────────────

const findActiveGeoFaculty = async (user: AuthUser) => {
  const faculty = await repo.findFacultyByUserId(user.id);
  if (!faculty || faculty.status !== "ACTIVE") {
    throw new AppError("Faculty not found or inactive", 404);
  }
  if (faculty.workLatitude == null || faculty.workLongitude == null) {
    throw new AppError("Work location not set. Contact admin.", 400);
  }
  return {
    id: faculty.id,
    workLatitude: faculty.workLatitude,
    workLongitude: faculty.workLongitude,
  };
};

/** Days recorded before punches existed only have summary times; convert them so session pairing stays consistent. */
const legacyBackfillPunches = (
  facultyId: string,
  date: Date,
  dateKey: string,
  row: { status: string; inTime: string | null; outTime: string | null } | null
): repo.CreatePunchData[] => {
  if (!row || row.status !== "PRESENT" || !row.inTime) return [];
  const make = (type: FacultyPunchType, timeHmm: string): repo.CreatePunchData => ({
    facultyId,
    date,
    type,
    timeHmm,
    punchedAt: istWallTimeToDate(dateKey, timeHmm),
    source: "MANUAL",
  });
  return row.outTime
    ? [make("CHECK_IN", row.inTime), make("CHECK_OUT", row.outTime)]
    : [make("CHECK_IN", row.inTime)];
};

/**
 * Append a punch for today (IST) and sync the day summary:
 * status PRESENT, inTime = first CHECK_IN, outTime = last CHECK_OUT (null while a session is open).
 */
const recordGeoPunch = async (params: {
  facultyId: string;
  type: FacultyPunchType;
  source: FacultyPunchSource;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
}) => {
  const now = new Date();
  const dateKey = getISTDateString(now);
  const date = repo.parseDateOnly(dateKey);

  return repo.withFacultyPunchLock(params.facultyId, async (tx) => {
    const row = await repo.findDayRowTx(tx, params.facultyId, date);
    const existing: FacultyPunchRow[] = await repo.findDayPunchesTx(tx, params.facultyId, date);
    const before = summarizeDayPunches(existing, row);

    if (params.type === "CHECK_IN" && before.openSession) {
      throw new AppError("You are already checked in. Check out before checking in again.", 409);
    }
    if (params.type === "CHECK_OUT" && !before.openSession) {
      throw new AppError("You are not checked in.", 400);
    }

    if (existing.length === 0) {
      const backfill = legacyBackfillPunches(params.facultyId, date, dateKey, row);
      if (backfill.length > 0) await repo.createPunchesTx(tx, backfill);
    }

    const punch = await repo.createPunchTx(tx, {
      facultyId: params.facultyId,
      date,
      type: params.type,
      punchedAt: now,
      timeHmm: getISTTimeString(now),
      source: params.source,
      latitude: params.latitude,
      longitude: params.longitude,
    });

    const summary = summarizeDayPunches(await repo.findDayPunchesTx(tx, params.facultyId, date));
    const record = await repo.upsertPresentDaySummaryTx(tx, {
      facultyId: params.facultyId,
      date,
      inTime: summary.firstIn,
      outTime: summary.openSession ? null : summary.lastOut,
    });

    return {
      ...record,
      date: dateKey,
      distanceMeters: Math.round(params.distanceMeters),
      punch: toPunchDto(punch),
      ...summary,
    };
  });
};

export const checkInMe = async (
  user: AuthUser,
  body: FacultySelfAttendanceGeoDto
) => {
  const faculty = await findActiveGeoFaculty(user);
  const dist = haversineMeters(
    body.latitude,
    body.longitude,
    faculty.workLatitude,
    faculty.workLongitude
  );
  if (dist > FACULTY_GEOFENCE_RADIUS_M) {
    throw new AppError(
      `You must be within 100 m of your assigned location to check in. Current distance: ${Math.round(dist)} m.`,
      403
    );
  }
  return recordGeoPunch({
    facultyId: faculty.id,
    type: "CHECK_IN",
    source: "MANUAL",
    latitude: body.latitude,
    longitude: body.longitude,
    distanceMeters: dist,
  });
};

export const checkOutMe = async (
  user: AuthUser,
  body: FacultyCheckOutDto
) => {
  const faculty = await findActiveGeoFaculty(user);
  const source = body.source ?? "MANUAL";

  if (source === "AUTO_GEOFENCE") {
    const latitude = body.latitude!;
    const longitude = body.longitude!;
    const dist = haversineMeters(
      latitude,
      longitude,
      faculty.workLatitude,
      faculty.workLongitude
    );
    if (dist <= FACULTY_GEOFENCE_RADIUS_M) {
      throw new AppError(
        `Auto check-out applies only outside 100 m of your assigned location. Current distance: ${Math.round(dist)} m.`,
        400
      );
    }
    return recordGeoPunch({
      facultyId: faculty.id,
      type: "CHECK_OUT",
      source: "AUTO_GEOFENCE",
      latitude,
      longitude,
      distanceMeters: dist,
    });
  }

  // MANUAL: no GPS / geofence — open session only
  return recordGeoPunch({
    facultyId: faculty.id,
    type: "CHECK_OUT",
    source: "MANUAL",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    distanceMeters: 0,
  });
};
