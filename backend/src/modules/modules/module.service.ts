import * as repository from "./module.repository";
import * as courseRepository from "../courses/course.repository";
import * as batchCurriculumService from "../batches/batch-curriculum.service";
import { CreateModuleDto, UpdateModuleDto, AddTopicDto } from "./module.types";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import { logger } from "../../config/logger";

/** Course curriculum follows course–branch visibility (plan: modules stay under course). */
const assertCourseAccess = async (courseId: string, currentUser: AuthUser) => {
  const scope = getBranchScopeFilter(currentUser);
  const course = await courseRepository.findCourseById(
    courseId,
    currentUser.instituteId,
    scope
  );
  if (!course || course.status === "DELETED") {
    throw new AppError("Course not found", 404);
  }
  return course;
};

/** Sync catalog module into existing batches at course-assigned branches (non-blocking on failure). */
const syncModuleToBatches = async (courseModuleId: string) => {
  try {
    await batchCurriculumService.syncCourseModuleToExistingBatches(courseModuleId);
  } catch (err) {
    logger.warn({ err, courseModuleId }, "Failed to sync course module to existing batches");
  }
};

export const getModulesByCourse = async (courseId: string, currentUser: AuthUser) => {
  await assertCourseAccess(courseId, currentUser);
  return repository.findModulesByCourseId(courseId);
};

export const createModule = async (currentUser: AuthUser, data: CreateModuleDto) => {
  await assertCourseAccess(data.courseId, currentUser);
  const created = await repository.createModule(data);
  await syncModuleToBatches(created.id);
  return created;
};

export const updateModule = async (
  id: string,
  currentUser: AuthUser,
  data: UpdateModuleDto
) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, currentUser);
  return repository.updateModule(id, data);
};

export const addTopic = async (
  moduleId: string,
  currentUser: AuthUser,
  data: AddTopicDto
) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, currentUser);
  const updated = await repository.addTopicToModule(moduleId, data);
  await syncModuleToBatches(moduleId);
  return updated;
};

export const toggleTopic = async (
  moduleId: string,
  currentUser: AuthUser,
  topicId: string
) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, currentUser);
  return repository.toggleTopicCompletion(moduleId, topicId);
};

export const deleteTopic = async (
  moduleId: string,
  currentUser: AuthUser,
  topicId: string
) => {
  const moduleItem = await repository.findModuleById(moduleId);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, currentUser);
  return repository.removeTopicFromModule(moduleId, topicId);
};

export const deleteModule = async (id: string, currentUser: AuthUser) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new AppError("Module not found", 404);
  }
  await assertCourseAccess(moduleItem.courseId, currentUser);

  const batchUsage = await repository.countBatchModuleUsage(id);
  if (batchUsage > 0) {
    throw new AppError(
      "Cannot delete module — it is linked to one or more batches. Remove it from those batches first.",
      409
    );
  }

  return repository.deleteModule(id);
};
