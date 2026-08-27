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
 * Ensure a batch belongs to the faculty (when pure faculty).
 */
export const assertFacultyOwnsBatch = async (
  currentUser: AuthUser,
  batchId: string
): Promise<void> => {
  const facultyId = await requireFacultyIdIfPureFaculty(currentUser);
  if (!facultyId) return;

  const batch = await prisma.batch.findFirst({
    where: { id: batchId, instituteId: currentUser.instituteId },
    select: { facultyId: true },
  });
  if (!batch) {
    throw new AppError("Batch not found", 404);
  }
  if (batch.facultyId !== facultyId) {
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
    where: { id: sessionId, instituteId: currentUser.instituteId },
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
 * Ensure a student is enrolled in at least one of the faculty's batches.
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
        facultyId,
        instituteId: currentUser.instituteId,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new AppError("You do not have access to this student", 403);
  }
};
