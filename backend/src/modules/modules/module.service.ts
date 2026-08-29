import * as repository from "./module.repository";
import * as courseRepository from "../courses/course.repository";
import { CreateModuleDto, UpdateModuleDto, AddTopicDto } from "./module.types";
import { AppError } from "../../middlewares/error.middleware";

const assertCourseAccess = async (courseId: string, instituteId: string) => {
  const course = await courseRepository.findCourseById(courseId, instituteId);
  if (!course || course.status === "DELETED") {
    throw new AppError("Course not found", 404);
  }
  return course;
};

export const getModulesByCourse = async (courseId: string, instituteId: string) => {
  await assertCourseAccess(courseId, instituteId);
  return repository.findModulesByCourseId(courseId);
};

export const createModule = async (instituteId: string, data: CreateModuleDto) => {
  await assertCourseAccess(data.courseId, instituteId);
  return repository.createModule(data);
};

export const updateModule = async (id: string, instituteId: string, data: UpdateModuleDto) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, instituteId);
  return repository.updateModule(id, data);
};

export const addTopic = async (moduleId: string, instituteId: string, data: AddTopicDto) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, instituteId);
  return repository.addTopicToModule(moduleId, data);
};

export const toggleTopic = async (moduleId: string, instituteId: string, topicId: string) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, instituteId);
  return repository.toggleTopicCompletion(moduleId, topicId);
};

export const deleteTopic = async (moduleId: string, instituteId: string, topicId: string) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, instituteId);
  return repository.removeTopicFromModule(moduleId, topicId);
};

export const deleteModule = async (id: string, instituteId: string) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, instituteId);

  const batchUsage = await repository.countBatchModuleUsage(id);
  if (batchUsage > 0) {
    throw new AppError(
      "Cannot delete module — it is linked to one or more batches. Remove it from those batches first.",
      409
    );
  }

  return repository.deleteModule(id);
};
