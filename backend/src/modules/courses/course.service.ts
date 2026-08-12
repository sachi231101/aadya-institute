import * as repository from "./course.repository";
import { CreateCourseDto, UpdateCourseDto, CourseQueryFilters } from "./course.types";

export const getCourses = async (instituteId: string, filters: CourseQueryFilters) => {
  return repository.findAllCourses(instituteId, filters);
};

export const getCourseById = async (id: string, instituteId: string) => {
  const course = await repository.findCourseById(id, instituteId);
  if (!course) {
    throw new Error("Course not found");
  }
  return course;
};

export const createCourse = async (instituteId: string, data: CreateCourseDto) => {
  return repository.createCourse(instituteId, data);
};

export const updateCourse = async (id: string, instituteId: string, data: UpdateCourseDto) => {
  await getCourseById(id, instituteId);
  return repository.updateCourse(id, instituteId, data);
};

export const deleteCourse = async (id: string, instituteId: string) => {
  await getCourseById(id, instituteId);
  return repository.deleteCourse(id, instituteId);
};
