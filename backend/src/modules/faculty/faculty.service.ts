import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { SequenceService } from "../masters/sequence.service";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import {
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
  resolveFacultyIdForUser,
} from "../../utils/auth-user.util";
import { prisma } from "../../config/database";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./faculty.repository";
import type {
  CreateFacultyDto,
  UpdateFacultyDto,
  ListFacultyQuery,
  MyStudentsQuery,
  MarkAttendanceDto,
} from "./faculty.validation";

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const mapSessionCard = (s: Awaited<ReturnType<typeof repo.findFacultySessionsInRange>>[number]) => {
  const now = new Date();
  const sessionDate = new Date(s.scheduledDate);
  const isToday =
    sessionDate.getFullYear() === now.getFullYear() &&
    sessionDate.getMonth() === now.getMonth() &&
    sessionDate.getDate() === now.getDate();

  let derivedStatus = (s.sessionStatus || "UPCOMING").toUpperCase();
  if (derivedStatus !== "LIVE" && derivedStatus !== "COMPLETED") {
    if (s.actualEndTime) derivedStatus = "COMPLETED";
    else if (isToday) derivedStatus = "UPCOMING";
    else if (sessionDate < startOfDay(now)) derivedStatus = "COMPLETED";
    else derivedStatus = "UPCOMING";
  }

  return {
    id: s.id,
    title: s.title,
    courseName: s.batch?.course?.name ?? null,
    courseCode: s.batch?.course?.code ?? null,
    subjectName: s.batchModule?.courseModule?.name ?? s.title,
    batchId: s.batch?.id ?? null,
    batchName: s.batch?.name ?? null,
    batchCode: s.batch?.code ?? null,
    scheduledDate: s.scheduledDate,
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

  if (
    !currentUser.roles.includes("ADMIN") &&
    currentUser.branchId &&
    faculty.branchId !== currentUser.branchId &&
    !isPureFaculty(currentUser.roles)
  ) {
    throw new AppError("Faculty not found", 404);
  }

  return faculty;
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
    employeeCode,
    specialization: dto.specialization,
    designation,
    designationMasterId,
    qualification,
    qualificationMasterId,
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
  });
};

/**
 * Soft-delete a faculty member.
 */
export const deleteFaculty = async (currentUser: AuthUser, id: string) => {
  await getFacultyById(currentUser, id);
  return repo.softDeleteFaculty(id);
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
    branchId: scope.branchId,
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

export const assignFacultyToBatch = async (batchId: string, facultyId: string) => {
  await repo.findFacultyById(facultyId).then((f) => {
    if (!f) throw new AppError("Faculty not found", 404);
  });
  return repo.assignFacultyToBatch(batchId, facultyId);
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
  if (!faculty) throw new AppError("Faculty not found", 404);

  return repo.upsertFacultyAttendance({
    facultyId,
    classSessionId: data.classSessionId,
    loginAt: data.loginAt ? new Date(data.loginAt) : undefined,
    logoutAt: data.logoutAt ? new Date(data.logoutAt) : undefined,
  });
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

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, 7));
  const weekStart = startOfDay(addDays(now, -((now.getDay() + 6) % 7))); // Monday
  const weekEnd = endOfDay(addDays(weekStart, 6));

  const [
    todayRaw,
    upcomingRaw,
    statusCounts,
    myBatches,
    recentFeedback,
    pendingGrading,
    pendingSubmissions,
    ratingStats,
  ] = await Promise.all([
    repo.findFacultySessionsInRange(facultyId, todayStart, todayEnd),
    repo.findFacultySessionsInRange(facultyId, addDays(todayStart, 1), upcomingEnd),
    repo.countFacultySessionsByStatus(facultyId, weekStart, weekEnd),
    repo.findFacultyBatchesSummary(facultyId),
    repo.findRecentFacultyFeedback(facultyId, 5),
    repo.findPendingGrading(facultyId, 10),
    repo.countPendingSubmissions(facultyId),
    repo.getFacultyAvgRating(facultyId),
  ]);

  const todaySessions = todayRaw.map(mapSessionCard);
  const upcomingSessions = upcomingRaw.map(mapSessionCard);

  const liveFromToday = todaySessions.filter((s) => s.sessionStatus === "LIVE").length;
  const completedToday = todaySessions.filter((s) => s.sessionStatus === "COMPLETED").length;

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
    },
    counts: {
      todayClasses: todaySessions.length,
      upcomingClasses: upcomingSessions.length,
      liveClasses: Math.max(statusCounts.live, liveFromToday),
      completedThisWeek: statusCounts.completedThisWeek + completedToday,
      pendingSubmissions,
      avgRating: ratingStats.avgRating,
      totalRatings: ratingStats.totalRatings,
    },
    todaySessions,
    upcomingSessions,
    myBatches: myBatches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      status: b.status,
      courseName: b.course?.name ?? null,
      courseCode: b.course?.code ?? null,
      studentCount: b._count.enrollments,
    })),
    recentFeedback: recentFeedback.map((f) => ({
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      submittedAt: f.submittedAt,
      studentName: f.student?.user?.name ?? f.student?.studentCode ?? "Student",
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

  return { data, meta: buildMeta(total, page, limit) };
};
