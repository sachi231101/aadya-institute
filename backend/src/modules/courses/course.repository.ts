import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";
import { buildCourseBranchVisibilityWhere } from "../../utils/course-branch.util";
import type { BranchScopeFilter } from "../../utils/branch-isolation.util";

const courseBranchInclude = {
  courseBranches: {
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  },
} as const;

export const findAllCourses = (
  instituteId: string,
  filters: CourseQueryFilters,
  scope?: BranchScopeFilter
) => {
  const visibility = scope ? buildCourseBranchVisibilityWhere(scope) : undefined;

  const where: Prisma.CourseWhereInput = {
    instituteId,
    ...(visibility || {}),
  };

  // Soft-deleted courses are hidden unless explicitly requested
  if (filters.status) {
    where.status = filters.status as Prisma.EnumStatusFilter["equals"];
  } else {
    where.status = { not: "DELETED" };
  }

  if (filters.category && filters.category !== "ALL") {
    where.category = filters.category;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.course.findMany({
    where,
    include: {
      ...courseBranchInclude,
      modules: {
        where: { status: { not: "DELETED" } },
        select: {
          id: true,
          name: true,
          code: true,
          sequence: true,
          duration: true,
          topics: true,
        },
        orderBy: { sequence: "asc" },
      },
      _count: {
        select: {
          batches: true,
          admissions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findCourseById = (
  id: string,
  instituteId: string,
  scope?: BranchScopeFilter
) => {
  const visibility = scope ? buildCourseBranchVisibilityWhere(scope) : undefined;

  return prisma.course.findFirst({
    where: {
      id,
      instituteId,
      ...(visibility || {}),
    },
    include: {
      ...courseBranchInclude,
      modules: {
        where: { status: { not: "DELETED" } },
        orderBy: { sequence: "asc" },
      },
      batches: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          startDate: true,
          capacity: true,
          schedulePattern: true,
          timeSlot: true,
        },
      },
    },
  });
};

export const findCourseByCode = (instituteId: string, code: string, excludeId?: string) => {
  return prisma.course.findFirst({
    where: {
      instituteId,
      code,
      status: { not: "DELETED" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
};

export const createCourse = (instituteId: string, data: CreateCourseDto) => {
  return prisma.course.create({
    data: {
      instituteId,
      name: data.name,
      code: data.code,
      description: data.description,
      duration: data.duration,
      category: data.category || "Web Development",
      mode: data.mode || "HYBRID",
      level: data.level || "BEGINNER",
      totalHours: data.totalHours || 100,
      fee: data.fee,
      courseBranches: {
        create: (data.branchIds ?? []).map((branchId) => ({ branchId })),
      },
    },
    include: courseBranchInclude,
  });
};

export const updateCourse = async (
  id: string,
  instituteId: string,
  data: UpdateCourseDto
) => {
  const { branchIds, ...courseData } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(courseData).length > 0) {
      await tx.course.updateMany({
        where: { id, instituteId },
        data: courseData,
      });
    }

    if (branchIds && branchIds.length > 0) {
      await tx.courseBranch.deleteMany({ where: { courseId: id } });
      await tx.courseBranch.createMany({
        data: branchIds.map((branchId) => ({ courseId: id, branchId })),
      });
    }
  });

  return findCourseById(id, instituteId);
};

/** Soft-delete — preserves admissions/batches FK integrity and frees the course code */
export const deleteCourse = async (id: string, instituteId: string) => {
  const course = await prisma.course.findFirst({ where: { id, instituteId } });
  if (!course) return { count: 0 };

  return prisma.course.updateMany({
    where: { id, instituteId },
    data: {
      status: "DELETED",
      code: `${course.code}__deleted__${Date.now()}`,
    },
  });
};
