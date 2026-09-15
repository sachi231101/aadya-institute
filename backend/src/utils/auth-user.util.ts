import { prisma } from "../config/database";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { AuthUser } from "../modules/auth/auth.types";
import { AppError } from "../middlewares/error.middleware";

/**
 * Map JWT payload on the request to AuthUser.
 * JWT uses `userId`; services expect `id`.
 */
export const toAuthUser = (req: AuthenticatedRequest): AuthUser => {
  const user = req.user!;
  return {
    id: user.userId,
    userId: user.userId,
    name: "User",
    instituteId: user.instituteId,
    branchId: user.branchId,
    allowedBranchIds: user.allowedBranchIds ?? [],
    roles: user.roles || [],
    permissions: [],
  };
};

export const isPureFaculty = (roles: string[] = []): boolean =>
  roles.includes("FACULTY") &&
  !roles.includes("ADMIN") &&
  !roles.includes("CENTER_MANAGER") &&
  !roles.includes("COUNSELLOR");

export const resolveFacultyIdForUser = async (userId: string): Promise<string | null> => {
  const faculty = await prisma.faculty.findFirst({
    where: { userId },
    select: { id: true },
  });
  return faculty?.id ?? null;
};

/**
 * For pure FACULTY users, return their facultyId or throw if profile missing.
 * Returns null for non-faculty roles (no faculty filter required).
 */
export const requireFacultyIdIfPureFaculty = async (
  currentUser: AuthUser
): Promise<string | null> => {
  if (!isPureFaculty(currentUser.roles)) return null;
  const facultyId = await resolveFacultyIdForUser(currentUser.id);
  if (!facultyId) {
    throw new AppError("Faculty profile not found for this user", 403);
  }
  return facultyId;
};

/**
 * Teaching-desk batch filter: coordinator, subject teacher, schedule assignee, or session host.
 * Used for list filters and ownership checks so faculty sees a consistent desk.
 */
export const facultyTeachingBatchWhere = (facultyId: string) => ({
  OR: [
    { facultyId },
    { batchCourses: { some: { facultyId } } },
    { schedules: { some: { facultyId } } },
    { classSessions: { some: { facultyId, status: "ACTIVE" as const } } },
  ],
});

/**
 * Resolve all batch IDs in the faculty teaching desk.
 */
export const getFacultyTeachingBatchIds = async (
  facultyId: string,
  instituteId: string
): Promise<string[]> => {
  const batches = await prisma.batch.findMany({
    where: {
      instituteId,
      ...facultyTeachingBatchWhere(facultyId),
    },
    select: { id: true },
  });
  return batches.map((b) => b.id);
};

/**
 * Student IDs actively enrolled in the faculty teaching desk.
 */
export const getFacultyTeachingStudentIds = async (
  facultyId: string,
  instituteId: string
): Promise<string[]> => {
  const batchIds = await getFacultyTeachingBatchIds(facultyId, instituteId);
  if (batchIds.length === 0) return [];

  const enrollments = await prisma.batchEnrollment.findMany({
    where: {
      status: "ACTIVE",
      batchId: { in: batchIds },
    },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  return enrollments.map((e) => e.studentId);
};

/**
 * Ensure a batch belongs to the faculty (when pure faculty).
 * Matches list filters: coordinator, BatchCourse, schedule, or class session.
 */
export const assertFacultyOwnsBatch = async (
  currentUser: AuthUser,
  batchId: string
): Promise<void> => {
  const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
  if (!facultyId) return;

  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      instituteId: currentUser.instituteId,
      ...facultyTeachingBatchWhere(facultyId),
    },
    select: { id: true },
  });
  if (!batch) {
    const exists = await prisma.batch.findFirst({
      where: { id: batchId, instituteId: currentUser.instituteId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError("Batch not found", 404);
    }
    throw new AppError("You do not have access to this batch", 403);
  }
};

/**
 * Ensure a class session belongs to the faculty (when pure faculty).
 */
export const assertFacultyOwnsSession = async (
  currentUser: AuthUser,
  sessionId: string
): Promise<void> => {
  const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
  if (!facultyId) return;

  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, batch: { instituteId: currentUser.instituteId } },
    select: { facultyId: true },
  });
  if (!session) {
    throw new AppError("Class session not found", 404);
  }
  if (session.facultyId !== facultyId) {
    throw new AppError("You do not have access to this class session", 403);
  }
};

/**
 * Ensure a student is enrolled in at least one of the faculty's teaching-desk batches.
 */
export const assertFacultyCanAccessStudent = async (
  currentUser: AuthUser,
  studentId: string
): Promise<void> => {
  const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
  if (!facultyId) return;

  const enrollment = await prisma.batchEnrollment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
      batch: {
        instituteId: currentUser.instituteId,
        ...facultyTeachingBatchWhere(facultyId),
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new AppError("You do not have access to this student", 403);
  }
};
