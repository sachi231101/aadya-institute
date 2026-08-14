import { prisma } from "../../../config/database";
import type { Prisma, LeadActivityType } from "@prisma/client";

export const LeadActivityService = {
  async logActivity(
    leadId: string,
    type: LeadActivityType,
    title: string,
    params?: {
      userId?: string;
      description?: string;
      metadata?: Record<string, unknown>;
      tx?: Prisma.TransactionClient;
    }
  ) {
    const client = params?.tx ?? prisma;
    return client.leadActivity.create({
      data: {
        leadId,
        userId: params?.userId ?? null,
        type,
        title,
        description: params?.description ?? null,
        metadata: params?.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  },

  async getActivitiesByLeadId(leadId: string) {
    return prisma.leadActivity.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
