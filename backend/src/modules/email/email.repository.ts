import { prisma } from "../../config/database";
import type { Prisma, EmailTemplateStatus, EmailLogStatus } from "@prisma/client";

export const EmailRepository = {
  async findTemplates(instituteId: string, params: {
    search?: string;
    status?: EmailTemplateStatus;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EmailTemplateWhereInput = {
      instituteId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { subject: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.emailTemplate.count({ where }),
      prisma.emailTemplate.findMany({
        where,
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async findTemplateById(id: string, instituteId: string) {
    return prisma.emailTemplate.findFirst({ where: { id, instituteId } });
  },

  async createTemplate(data: Prisma.EmailTemplateCreateInput) {
    return prisma.emailTemplate.create({ data });
  },

  async updateTemplate(id: string, instituteId: string, data: Prisma.EmailTemplateUpdateInput) {
    await prisma.emailTemplate.updateMany({ where: { id, instituteId }, data });
    return EmailRepository.findTemplateById(id, instituteId);
  },

  async deleteTemplate(id: string, instituteId: string) {
    return prisma.emailTemplate.updateMany({
      where: { id, instituteId },
      data: { status: "INACTIVE" },
    });
  },

  async findLogs(instituteId: string, params: {
    templateId?: string;
    status?: EmailLogStatus;
    search?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EmailLogWhereInput = {
      instituteId,
      ...(params.templateId ? { templateId: params.templateId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { toEmail: { contains: params.search, mode: "insensitive" } },
              { subject: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          sentBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async createLog(data: Prisma.EmailLogCreateInput) {
    return prisma.emailLog.create({ data });
  },

  async updateLog(id: string, data: Prisma.EmailLogUpdateInput) {
    return prisma.emailLog.update({ where: { id }, data });
  },
};

function interpolateTemplate(text: string, variables: Record<string, string> = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
}

export { interpolateTemplate };
