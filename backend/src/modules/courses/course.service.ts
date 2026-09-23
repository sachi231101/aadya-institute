import * as repository from "./course.repository";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import {
  getBranchScopeFilter,
  hasBranchAccess,
  isBranchLockedRole,
} from "../../utils/branch-isolation.util";
import { prisma } from "../../config/database";

/** Prisma Decimal JSON-serializes as a string; expose a real number to API clients. */
const toFeeNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const serializeCourse = <T extends { fee?: unknown; courseBranches?: Array<{ branchId: string }> }>(
  course: T
): T & { fee: number | null; branchIds: string[] } => ({
  ...course,
  fee: toFeeNumber(course.fee),
  branchIds: (course.courseBranches ?? []).map((cb) => cb.branchId),
});

/**
 * Resolve and authorize branchIds for course create/update.
 * - Validates each id is an ACTIVE branch of the institute
 * - Non-admin: every id must pass hasBranchAccess; single-branch users are forced to that branch
 * - Empty input: auto-assign when institute has exactly one ACTIVE branch
 */
const resolveAuthorizedBranchIds = async (
  user: AuthUser,
  requested: string[] | undefined
): Promise<string[]> => {
  const activeBranches = await prisma.branch.findMany({
    where: { instituteId: user.instituteId, status: "ACTIVE" },
    select: { id: true },
  });
  const activeIds = new Set(activeBranches.map((b) => b.id));

  if (activeIds.size === 0) {
    throw new AppError("No active branches available for this institute", 400);
  }

  let branchIds = [...new Set((requested ?? []).filter(Boolean))];

  if (branchIds.length === 0 && activeIds.size === 1) {
    branchIds = [activeBranches[0].id];
  }

  if (branchIds.length === 0) {
    throw new AppError("Select at least one branch", 400);
  }

  for (const id of branchIds) {
    if (!activeIds.has(id)) {
      throw new AppError("One or more selected branches are invalid or inactive", 400);
    }
  }

  if (isBranchLockedRole(user.roles)) {
    const allowed = user.allowedBranchIds?.length
      ? user.allowedBranchIds
      : user.branchId
        ? [user.branchId]
        : [];

    if (allowed.length === 1) {
      branchIds = [allowed[0]];
    } else {
      for (const id of branchIds) {
        if (!hasBranchAccess(user, id)) {
          throw new AppError("You do not have access to one or more selected branches", 403);
        }
      }
    }
  }

  return branchIds;
};

export const getCourses = async (
  user: AuthUser,
  filters: CourseQueryFilters
) => {
  const scope = getBranchScopeFilter(user, filters.branchId);
  const courses = await repository.findAllCourses(user.instituteId, filters, scope);
  return courses.map(serializeCourse);
};

export const getCourseById = async (
  id: string,
  user: AuthUser,
  requestedBranchId?: string
) => {
  const scope = getBranchScopeFilter(user, requestedBranchId);
  const course = await repository.findCourseById(id, user.instituteId, scope);
  if (!course || course.status === "DELETED") {
    throw new AppError("Course not found", 404);
  }
  return serializeCourse(course);
};

export const createCourse = async (user: AuthUser, data: CreateCourseDto) => {
  const branchIds = await resolveAuthorizedBranchIds(user, data.branchIds);
  const existing = await repository.findCourseByCode(user.instituteId, data.code);
  if (existing) {
    throw new AppError(`Course code "${data.code}" already exists`, 409);
  }
  return serializeCourse(
    await repository.createCourse(user.instituteId, { ...data, branchIds })
  );
};

export const updateCourse = async (
  id: string,
  user: AuthUser,
  data: UpdateCourseDto
) => {
  await getCourseById(id, user);

  if (data.code) {
    const existing = await repository.findCourseByCode(user.instituteId, data.code, id);
    if (existing) {
      throw new AppError(`Course code "${data.code}" already exists`, 409);
    }
  }

  const payload: UpdateCourseDto = { ...data };
  if (data.branchIds !== undefined) {
    payload.branchIds = await resolveAuthorizedBranchIds(user, data.branchIds);
  }

  const course = await repository.updateCourse(id, user.instituteId, payload);
  return course ? serializeCourse(course) : course;
};

export const deleteCourse = async (id: string, user: AuthUser) => {
  await getCourseById(id, user);
  return repository.deleteCourse(id, user.instituteId);
};
