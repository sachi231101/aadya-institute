import { prisma } from "../../config/database";
import { CreateModuleDto, UpdateModuleDto, AddTopicDto, TopicItem } from "./module.types";

export const findModulesByCourseId = (courseId: string) => {
  return prisma.courseModule.findMany({
    where: { courseId, status: { not: "DELETED" } },
    orderBy: { sequence: "asc" },
  });
};

export const findModuleById = (id: string) => {
  return prisma.courseModule.findUnique({
    where: { id },
  });
};

export const createModule = async (data: CreateModuleDto) => {
  let sequence = data.sequence;
  if (!sequence) {
    const existingCount = await prisma.courseModule.count({
      where: { courseId: data.courseId },
    });
    sequence = existingCount + 1;
  }

  return prisma.courseModule.create({
    data: {
      courseId: data.courseId,
      name: data.name,
      code: data.code || `MOD-${sequence}`,
      description: data.description,
      sequence,
      duration: data.duration || 10,
      topics: [],
    },
  });
};

export const updateModule = (id: string, data: UpdateModuleDto) => {
  return prisma.courseModule.update({
    where: { id },
    data,
  });
};

export const addTopicToModule = async (moduleId: string, data: AddTopicDto) => {
  const moduleItem = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleItem) throw new Error("Module not found");

  const existingTopics = (moduleItem.topics as unknown as TopicItem[]) || [];
  const newTopic: TopicItem = {
    id: `topic-${Date.now()}`,
    title: data.title,
    durationHours: data.durationHours || 4,
    description: data.description,
    isCompleted: false,
  };

  const updatedTopics = [...existingTopics, newTopic];

  return prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      topics: updatedTopics as any,
    },
  });
};

export const toggleTopicCompletion = async (moduleId: string, topicId: string) => {
  const moduleItem = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleItem) throw new Error("Module not found");

  const existingTopics = (moduleItem.topics as unknown as TopicItem[]) || [];
  const updatedTopics = existingTopics.map((t) =>
    t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
  );

  return prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      topics: updatedTopics as any,
    },
  });
};

export const removeTopicFromModule = async (moduleId: string, topicId: string) => {
  const moduleItem = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleItem) throw new Error("Module not found");

  const existingTopics = (moduleItem.topics as unknown as TopicItem[]) || [];
  const updatedTopics = existingTopics.filter((t) => t.id !== topicId);

  return prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      topics: updatedTopics as any,
    },
  });
};

export const countBatchModuleUsage = (courseModuleId: string) => {
  return prisma.batchModule.count({
    where: { courseModuleId },
  });
};

export const deleteModule = (id: string) => {
  return prisma.courseModule.delete({
    where: { id },
  });
};
