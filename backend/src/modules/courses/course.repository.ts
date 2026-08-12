import { prisma } from "../../config/database";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";

export const findAllCourses = (instituteId: string, filters: CourseQueryFilters) => {
  const where: Record<string, unknown> = {
    instituteId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.course.findMany({
    where,
    include: {
      modules: {
        select: {
          id: true,
          name: true,
          sequence: true,
          duration: true,
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
        orderBy: { sequence: "asc" },
      },
      batches: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          startDate: true,
        },
      },
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
    },
  });
};

export const updateCourse = (id: string, instituteId: string, data: UpdateCourseDto) => {
  return prisma.course.updateMany({
    where: { id, instituteId },
    data,
  });
};

export const deleteCourse = (id: string, instituteId: string) => {
  return prisma.course.deleteMany({
    where: { id, instituteId },
  });
};
