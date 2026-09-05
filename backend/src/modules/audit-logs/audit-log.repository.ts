import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

export const AuditLogRepository = {
  async findMany(instituteId: string, params: {
    userId?: string;
    branchId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.ActivityLogWhereInput = {
      instituteId,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.action ? { action: { contains: params.action, mode: "insensitive" } } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { action: { contains: params.search, mode: "insensitive" } },
              { entityType: { contains: params.search, mode: "insensitive" } },
              { entityId: { contains: params.search, mode: "insensitive" } },
              { user: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return { total, data };
  },
};
