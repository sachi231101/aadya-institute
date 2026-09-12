import * as repository from "./course.repository";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";
import { AppError } from "../../middlewares/error.middleware";

/** Prisma Decimal JSON-serializes as a string; expose a real number to API clients. */
const toFeeNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const serializeCourse = <T extends { fee?: unknown }>(course: T): T & { fee: number | null } => ({
  ...course,
  fee: toFeeNumber(course.fee),
});

export const getCourses = async (instituteId: string, filters: CourseQueryFilters) => {
  const courses = await repository.findAllCourses(instituteId, filters);
  return courses.map(serializeCourse);
};

export const getCourseById = async (id: string, instituteId: string) => {
  const course = await repository.findCourseById(id, instituteId);
  if (!course || course.status === "DELETED") {
    throw new AppError("Course not found", 404);
  }
  return serializeCourse(course);
};

export const createCourse = async (instituteId: string, data: CreateCourseDto) => {
  const existing = await repository.findCourseByCode(instituteId, data.code);
  if (existing) {
    throw new AppError(`Course code "${data.code}" already exists`, 409);
  }
  return serializeCourse(await repository.createCourse(instituteId, data));
};

export const updateCourse = async (id: string, instituteId: string, data: UpdateCourseDto) => {
  await getCourseById(id, instituteId);

  if (data.code) {
    const existing = await repository.findCourseByCode(instituteId, data.code, id);
    if (existing) {
      throw new AppError(`Course code "${data.code}" already exists`, 409);
    }
  }

  const course = await repository.updateCourse(id, instituteId, data);
  return course ? serializeCourse(course) : course;
};

export const deleteCourse = async (id: string, instituteId: string) => {
  await getCourseById(id, instituteId);
  return repository.deleteCourse(id, instituteId);
};
