import { prisma } from "../../config/database";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";

export const findAllCourses = (instituteId: string, filters: CourseQueryFilters) => {
  const where: Record<string, unknown> = {
    instituteId,
  };

  // Soft-deleted courses are hidden unless explicitly requested
  if (filters.status) {
    where.status = filters.status;
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

export const findCourseById = (id: string, instituteId: string) => {
  return prisma.course.findFirst({
    where: { id, instituteId },
    include: {
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
    },
  });
};

export const updateCourse = async (id: string, instituteId: string, data: UpdateCourseDto) => {
  await prisma.course.updateMany({
    where: { id, instituteId },
    data,
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


