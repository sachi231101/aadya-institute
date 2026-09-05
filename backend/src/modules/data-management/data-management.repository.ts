import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const DataManagementRepository = {
  async createImportJob(data: Prisma.DataImportJobCreateInput) {
    return prisma.dataImportJob.create({ data });
  },

  async updateImportJob(id: string, instituteId: string, data: Prisma.DataImportJobUpdateInput) {
    await prisma.dataImportJob.updateMany({ where: { id, instituteId }, data });
    return prisma.dataImportJob.findFirst({ where: { id, instituteId } });
  },

  async findImportJob(id: string, instituteId: string) {
    return prisma.dataImportJob.findFirst({ where: { id, instituteId } });
  },

  async listImportJobs(instituteId: string, params: { skip: number; take: number }) {
    const where = { instituteId };
    const [total, data] = await Promise.all([
      prisma.dataImportJob.count({ where }),
      prisma.dataImportJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          entityType: true,
          status: true,
          fileName: true,
          totalRows: true,
          successRows: true,
          errorRows: true,
          createdAt: true,
          completedAt: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return { total, data };
  },

  async createExportJob(data: Prisma.DataExportJobCreateInput) {
    return prisma.dataExportJob.create({ data });
  },

  async updateExportJob(id: string, instituteId: string, data: Prisma.DataExportJobUpdateInput) {
    await prisma.dataExportJob.updateMany({ where: { id, instituteId }, data });
    return prisma.dataExportJob.findFirst({ where: { id, instituteId } });
  },

  async findExportByToken(token: string) {
    return prisma.dataExportJob.findFirst({
      where: { downloadToken: token },
    });
  },

  async findBranchIdsForInstitute(instituteId: string) {
    const branches = await prisma.branch.findMany({
      where: { instituteId },
      select: { id: true },
    });
    return new Set(branches.map((b) => b.id));
  },

  async listDeleted(instituteId: string) {
    const [branches, users] = await Promise.all([
      prisma.branch.findMany({
        where: { instituteId, status: "DELETED" },
        select: { id: true, name: true, code: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { instituteId, status: "BLOCKED" },
        select: { id: true, name: true, email: true, phone: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return { branches, users };
  },

  async restoreBranch(id: string, instituteId: string) {
    const result = await prisma.branch.updateMany({
      where: { id, instituteId, status: "DELETED" },
      data: { status: "ACTIVE" },
    });
    if (result.count === 0) return null;
    return prisma.branch.findFirst({ where: { id, instituteId } });
  },

  async getOrCreateBackupStatus(instituteId: string) {
    return prisma.backupStatus.upsert({
      where: { instituteId },
      create: {
        instituteId,
        status: "UNKNOWN",
        message: "No backup has been recorded yet",
      },
      update: {},
    });
  },

  async findRolesByNames(roleNames: string[]) {
    return prisma.role.findMany({
      where: { name: { in: roleNames } },
      select: { id: true, name: true },
    });
  },

  async exportStudents(instituteId: string) {
    return prisma.student.findMany({
      where: { instituteId },
      include: { user: { select: { name: true, email: true, phone: true } }, branch: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
  },

  async exportLeads(instituteId: string) {
    return prisma.lead.findMany({
      where: { instituteId },
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
  },

  async exportUsers(instituteId: string) {
    return prisma.user.findMany({
      where: { instituteId },
      include: {
        userRoles: { include: { role: { select: { name: true } } } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
  },

  async exportBranches(instituteId: string) {
    return prisma.branch.findMany({
      where: { instituteId, status: { not: "DELETED" } },
      orderBy: { name: "asc" },
    });
  },
};
