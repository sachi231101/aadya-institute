import * as repository from "./module.repository";
import { CreateModuleDto, UpdateModuleDto, AddTopicDto } from "./module.types";

export const getModulesByCourse = async (courseId: string) => {
  return repository.findModulesByCourseId(courseId);
};

export const createModule = async (data: CreateModuleDto) => {
  return repository.createModule(data);
};

export const updateModule = async (id: string, data: UpdateModuleDto) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new Error("Module not found");
  }
  return repository.updateModule(id, data);
};

export const addTopic = async (moduleId: string, data: AddTopicDto) => {
  return repository.addTopicToModule(moduleId, data);
};

export const toggleTopic = async (moduleId: string, topicId: string) => {
  return repository.toggleTopicCompletion(moduleId, topicId);
};

export const deleteModule = async (id: string) => {
  const moduleItem = await repository.findModuleById(id);
  if (!moduleItem) {
    throw new Error("Module not found");
  }
  return repository.deleteModule(id);
};
