import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import type { BranchScopeFilter } from "./branch-isolation.util";

/**
 * Prisma where fragment for course visibility via CourseBranch.
 * Admin with no branch filter → undefined (no junction constraint).
 * Single branchId or branchIds IN → course must be linked to at least one.
 */
export const buildCourseBranchVisibilityWhere = (
  scope: BranchScopeFilter
): Prisma.CourseWhereInput | undefined => {
  if (scope.branchId) {
    return {
      courseBranches: { some: { branchId: scope.branchId } },
    };
  }
  if (scope.branchIds && scope.branchIds.length > 0) {
    return {
      courseBranches: { some: { branchId: { in: scope.branchIds } } },
    };
  }
  return undefined;
};

/**
 * Ensure a course is linked to the given branch (and belongs to the institute).
 * Throws 400 when the course is not available for that branch.
 */
export const assertCourseAvailableForBranch = async (
  instituteId: string,
  courseId: string,
  branchId: string,
  options?: { requireActive?: boolean; tx?: Prisma.TransactionClient }
): Promise<void> => {
  const client = options?.tx ?? prisma;
  const course = await client.course.findFirst({
    where: {
      id: courseId,
      instituteId,
      ...(options?.requireActive ? { status: "ACTIVE" } : {}),
    },
    select: { id: true },
  });

  if (!course) {
    throw new AppError("Selected course was not found for this institute", 400);
  }

  const linked = await client.courseBranch.findFirst({
    where: { courseId, branchId },
    select: { id: true },
  });

  if (!linked) {
    throw new AppError(
      "Selected course is not available for this branch",
      400
    );
  }
};
