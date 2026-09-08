import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";
import { PLATFORM_SETTINGS_ID } from "./ai-calling.types";

export const AiCallingRepository = {
  async ensurePlatformSettings() {
    const existing = await prisma.aiCallingPlatformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
    });
    if (existing) return existing;
    return prisma.aiCallingPlatformSettings.create({
      data: {
        id: PLATFORM_SETTINGS_ID,
        defaultConcurrency: 3,
      },
    });
  },

  async getPlatformSettings() {
    return this.ensurePlatformSettings();
  },

  async updatePlatformSettings(data: Prisma.AiCallingPlatformSettingsUpdateInput) {
    await this.ensurePlatformSettings();
    return prisma.aiCallingPlatformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data,
    });
  },

  async findInstituteConfig(instituteId: string) {
    return prisma.instituteAiCallingConfig.findUnique({
      where: { instituteId },
      include: { agent: true },
    });
  },

  async upsertInstituteConfig(
    instituteId: string,
    data: Omit<Prisma.InstituteAiCallingConfigUncheckedCreateInput, "id" | "instituteId">
  ) {
    return prisma.instituteAiCallingConfig.upsert({
      where: { instituteId },
      create: { instituteId, ...data },
      update: data,
      include: { agent: true },
    });
  },

  async listActiveAgents() {
    return prisma.aiCallingAgent.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  async listAgents() {
    return prisma.aiCallingAgent.findMany({ orderBy: { name: "asc" } });
  },

  async createAgent(data: Prisma.AiCallingAgentCreateInput) {
    return prisma.aiCallingAgent.create({ data });
  },

  async updateAgent(id: string, data: Prisma.AiCallingAgentUpdateInput) {
    return prisma.aiCallingAgent.update({ where: { id }, data });
  },

  async deleteAgent(id: string) {
    return prisma.aiCallingAgent.delete({ where: { id } });
  },

  async findAgentById(id: string) {
    return prisma.aiCallingAgent.findUnique({ where: { id } });
  },

  async findCallLogById(id: string, instituteId: string) {
    return prisma.callLog.findFirst({
      where: { id, instituteId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            branchId: true,
          },
        },
        agent: { select: { id: true, name: true, provider: true } },
      },
    });
  },

  async findCallLogByExternalId(externalCallId: string) {
    return prisma.callLog.findUnique({
      where: { externalCallId },
      include: {
        lead: { select: { id: true, instituteId: true, createdById: true, stage: true } },
      },
    });
  },

  async findCallLogByIdempotencyKey(idempotencyKey: string) {
    return prisma.callLog.findUnique({ where: { idempotencyKey } });
  },

  async findLatestAttempt(leadId: string) {
    return prisma.callLog.findFirst({
      where: { leadId },
      orderBy: { attemptNumber: "desc" },
    });
  },

  async hasNonFailedAttempt(leadId: string) {
    const log = await prisma.callLog.findFirst({
      where: {
        leadId,
        NOT: { status: "FAILED" },
      },
      select: { id: true },
    });
    return Boolean(log);
  },

  async createCallLog(data: Prisma.CallLogUncheckedCreateInput) {
    return prisma.callLog.create({ data });
  },

  async updateCallLog(id: string, data: Prisma.CallLogUncheckedUpdateInput) {
    return prisma.callLog.update({
      where: { id },
      data: data as Prisma.CallLogUncheckedUpdateInput,
    });
  },

  async getUsageDaily(instituteId: string, date: Date) {
    return prisma.aiCallingUsageDaily.findUnique({
      where: {
        instituteId_date: { instituteId, date },
      },
    });
  },

  async incrementUsage(
    instituteId: string,
    date: Date,
    delta: { initiated?: number; completed?: number; durationSeconds?: number }
  ) {
    return prisma.aiCallingUsageDaily.upsert({
      where: { instituteId_date: { instituteId, date } },
      create: {
        instituteId,
        date,
        initiatedCount: delta.initiated ?? 0,
        completedCount: delta.completed ?? 0,
        durationSeconds: delta.durationSeconds ?? 0,
      },
      update: {
        initiatedCount: delta.initiated
          ? { increment: delta.initiated }
          : undefined,
        completedCount: delta.completed
          ? { increment: delta.completed }
          : undefined,
        durationSeconds: delta.durationSeconds
          ? { increment: delta.durationSeconds }
          : undefined,
      },
    });
  },

  async listUsage(instituteId: string, from: Date, to: Date) {
    return prisma.aiCallingUsageDaily.findMany({
      where: {
        instituteId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: "asc" },
    });
  },

  async findInstituteTimezone(instituteId: string) {
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { timezone: true },
    });
    return institute?.timezone || "Asia/Kolkata";
  },

  async findAiCallingIntegration(instituteId: string) {
    return prisma.integration.findUnique({
      where: {
        instituteId_type: { instituteId, type: "AI_CALLING" },
      },
    });
  },
};
