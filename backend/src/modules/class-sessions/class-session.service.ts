import { classSessionRepository } from "./class-session.repository";
import { CreateClassSessionDto, UpdateClassSessionDto, QueryClassSessionsDto } from "./class-session.types";

export const classSessionService = {
  getSessions: async (instituteId: string, branchId?: string, filters?: QueryClassSessionsDto) => {
    return classSessionRepository.findMany(instituteId, branchId, filters);
  },

  getSessionById: async (id: string, instituteId: string) => {
    const session = await classSessionRepository.findById(id, instituteId);
    if (!session) {
      throw new Error("Class session not found");
    }
    return session;
  },

  createSession: async (instituteId: string, data: CreateClassSessionDto) => {
    return classSessionRepository.create(instituteId, data);
  },

  updateSession: async (id: string, instituteId: string, data: UpdateClassSessionDto) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    return classSessionRepository.update(id, instituteId, data);
  },

  cancelSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    return classSessionRepository.update(id, instituteId, { status: "CANCELLED" });
  },

  deleteSession: async (id: string, instituteId: string) => {
    const existing = await classSessionRepository.findById(id, instituteId);
    if (!existing) {
      throw new Error("Class session not found");
    }
    return classSessionRepository.delete(id);
  },
};
