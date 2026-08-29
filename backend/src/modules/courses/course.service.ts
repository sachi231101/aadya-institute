import * as repository from "./course.repository";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";
import { AppError } from "../../middlewares/error.middleware";

export const getCourses = async (instituteId: string, filters: CourseQueryFilters) => {
  return repository.findAllCourses(instituteId, filters);
};

export const getCourseById = async (id: string, instituteId: string) => {
  const course = await repository.findCourseById(id, instituteId);
  if (!course || course.status === "DELETED") {
    throw new AppError("Course not found", 404);
  }
  return course;
};

export const createCourse = async (instituteId: string, data: CreateCourseDto) => {
  const existing = await repository.findCourseByCode(instituteId, data.code);
  if (existing) {
    throw new AppError(`Course code "${data.code}" already exists`, 409);
  }
  return repository.createCourse(instituteId, data);
};

export const updateCourse = async (id: string, instituteId: string, data: UpdateCourseDto) => {
  await getCourseById(id, instituteId);

  if (data.code) {
    const existing = await repository.findCourseByCode(instituteId, data.code, id);
    if (existing) {
      throw new AppError(`Course code "${data.code}" already exists`, 409);
    }
  }

  return repository.updateCourse(id, instituteId, data);
};

export const deleteCourse = async (id: string, instituteId: string) => {
  await getCourseById(id, instituteId);
  return repository.deleteCourse(id, instituteId);
};
