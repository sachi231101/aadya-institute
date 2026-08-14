import { prisma } from "../../config/database";
import type { Prisma, LeadSource, LeadStage, LeadStatus, LeadLostReason } from "@prisma/client";
import { LeadActivityService } from "./services/lead-activity.service";

export interface LeadFindManyParams {
  instituteId: string;
  branchId?: string;
  assignedCounsellorId?: string;
  courseId?: string;
  stage?: LeadStage;
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  skip: number;
  take: number;
}

export const leadInclude = {
  assignedCounsellor: {
    select: { id: true, name: true, email: true, phone: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  branch: {
    select: { id: true, name: true, code: true },
  },
  course: {
    select: { id: true, name: true, code: true },
  },
  followUps: {
    orderBy: { scheduledAt: "asc" as const },
    take: 5,
  },
  activities: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
} satisfies Prisma.LeadInclude;

export const LeadRepository = {
  async findActiveLeadByPhone(phoneNumber: string, instituteId: string) {
    return prisma.lead.findFirst({
      where: {
        phoneNumber,
        instituteId,
        status: "ACTIVE",
      },
      include: {
        assignedCounsellor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  },

  async createLead(params: {
    instituteId: string;
    branchId: string;
    name: string;
    phoneNumber: string;
    email?: string;
    interestedIn: string;
    courseId?: string;
    source: LeadSource;
    priority?: string;
    notes?: string;
    createdById: string;
    assignedCounsellorId?: string;
  }) {
    const {
      instituteId,
      branchId,
      name,
      phoneNumber,
      email,
      interestedIn,
      courseId,
      source,
      priority,
      notes,
      createdById,
      assignedCounsellorId,
    } = params;

    const initialStage: LeadStage = assignedCounsellorId ? "ASSIGNED" : "NEW";

    return prisma.$transaction(async (tx) => {
      // 1. Create Lead
      const lead = await tx.lead.create({
        data: {
          instituteId,
          branchId,
          name,
          phoneNumber,
          email: email ?? null,
          interestedIn,
          courseId: courseId ?? null,
          source,
          stage: initialStage,
          status: "ACTIVE",
          priority: priority ?? "MEDIUM",
          notes: notes ?? null,
          createdById,
          assignedCounsellorId: assignedCounsellorId ?? null,
        },
        include: leadInclude,
      });

      // 2. Create Initial Assignment Record if assigned
      if (assignedCounsellorId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            counsellorId: assignedCounsellorId,
            assignedById: createdById,
            isCurrent: true,
            notes: "Initial assignment upon lead creation",
          },
        });
      }

      // 3. Create Stage History Record
      await tx.leadStageHistory.create({
        data: {
          leadId: lead.id,
          fromStage: null,
          toStage: initialStage,
          changedById: createdById,
          notes: "Lead created",
        },
      });

      // 4. Log Activity
      await LeadActivityService.logActivity(
        lead.id,
        "LEAD_CREATED",
        `Lead created via ${source}`,
        {
          userId: createdById,
          description: `Interested in ${interestedIn}`,
          metadata: { source, stage: initialStage },
          tx,
        }
      );

      return lead;
    });
  },

  async findLeadById(id: string, instituteId: string, branchId?: string) {
    const where: Prisma.LeadWhereInput = {
      id,
      instituteId,
      ...(branchId ? { branchId } : {}),
    };

    return prisma.lead.findFirst({
      where,
      include: {
        assignedCounsellor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        branch: {
          select: { id: true, name: true, code: true, address: true, phone: true },
        },
        course: {
          select: { id: true, name: true, code: true, duration: true },
        },
        convertedStudent: {
          select: { id: true, studentCode: true },
        },
        convertedAdmission: {
          select: { id: true, admissionNo: true, status: true },
        },
        assignments: {
          include: {
            counsellor: { select: { id: true, name: true, email: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        stageHistory: {
          include: {
            changedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        followUps: {
          include: {
            counsellor: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async findLeads(params: LeadFindManyParams) {
    const {
      instituteId,
      branchId,
      assignedCounsellorId,
      courseId,
      stage,
      status,
      source,
      search,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
      skip,
      take,
    } = params;

    const where: Prisma.LeadWhereInput = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      ...(assignedCounsellorId ? { assignedCounsellorId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(stage ? { stage } : {}),
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(priority ? { priority } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { interestedIn: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (followUpFrom || followUpTo) {
      where.nextFollowUpAt = {
        ...(followUpFrom ? { gte: new Date(followUpFrom) } : {}),
        ...(followUpTo ? { lte: new Date(followUpTo) } : {}),
      };
    }

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, total };
  },

  async updateLead(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({
      where: { id },
      data,
      include: leadInclude,
    });
  },

  async changeStage(
    leadId: string,
    newStage: LeadStage,
    changedById: string,
    notes?: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;

    const oldStage = lead.stage;

    return prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: newStage,
          ...(newStage === "CONTACTED" && !lead.lastContactedAt
            ? { lastContactedAt: new Date() }
            : {}),
        },
        include: leadInclude,
      });

      await tx.leadStageHistory.create({
        data: {
          leadId,
          fromStage: oldStage,
          toStage: newStage,
          changedById,
          notes: notes ?? null,
        },
      });

      await LeadActivityService.logActivity(
        leadId,
        "STAGE_CHANGED",
        `Stage changed from ${oldStage} to ${newStage}`,
        {
          userId: changedById,
          description: notes ?? undefined,
          metadata: { fromStage: oldStage, toStage: newStage },
          tx,
        }
      );

      return updatedLead;
    });
  },

  async markLost(
    leadId: string,
    reason: LeadLostReason,
    lostById: string,
    notes?: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;

    const oldStage = lead.stage;

    return prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: "LOST",
          status: "LOST",
          lostAt: new Date(),
          lostReason: reason,
          lostNotes: notes ?? null,
        },
        include: leadInclude,
      });

      await tx.leadStageHistory.create({
        data: {
          leadId,
          fromStage: oldStage,
          toStage: "LOST",
          changedById: lostById,
          notes: `Reason: ${reason}. ${notes ?? ""}`,
        },
      });

      await LeadActivityService.logActivity(
        leadId,
        "MARKED_LOST",
        `Lead marked as LOST. Reason: ${reason}`,
        {
          userId: lostById,
          description: notes ?? undefined,
          metadata: { reason, previousStage: oldStage },
          tx,
        }
      );

      return updatedLead;
    });
  },

  async getDashboardSummary(instituteId: string, branchId?: string) {
    const baseWhere = {
      instituteId,
      ...(branchId ? { branchId } : {}),
    };

    const [
      totalLeads,
      newCount,
      assignedCount,
      contactedCount,
      interestedCount,
      followUpCount,
      convertedCount,
      lostCount,
    ] = await prisma.$transaction([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { ...baseWhere, stage: "NEW" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "ASSIGNED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "CONTACTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "INTERESTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "FOLLOW_UP" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "CONVERTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "LOST" } }),
    ]);

    return {
      totalLeads,
      new: newCount,
      assigned: assignedCount,
      contacted: contactedCount,
      interested: interestedCount,
      followUp: followUpCount,
      converted: convertedCount,
      lost: lostCount,
    };
  },

  async getCounsellorPerformance(instituteId: string, branchId?: string) {
    const counsellors = await prisma.user.findMany({
      where: {
        instituteId,
        ...(branchId ? { branchId } : {}),
        userRoles: {
          some: {
            role: { name: "COUNSELLOR" },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        branch: { select: { id: true, name: true } },
      },
    });

    const performance = await Promise.all(
      counsellors.map(async (c) => {
        const baseWhere = {
          instituteId,
          assignedCounsellorId: c.id,
        };

        const [total, contacted, interested, followUps, converted, lost] =
          await prisma.$transaction([
            prisma.lead.count({ where: baseWhere }),
            prisma.lead.count({
              where: { ...baseWhere, stage: { in: ["CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERTED"] } },
            }),
            prisma.lead.count({ where: { ...baseWhere, stage: "INTERESTED" } }),
            prisma.leadFollowUp.count({ where: { counsellorId: c.id } }),
            prisma.lead.count({ where: { ...baseWhere, stage: "CONVERTED" } }),
            prisma.lead.count({ where: { ...baseWhere, stage: "LOST" } }),
          ]);

        const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) + "%" : "0%";

        return {
          counsellorId: c.id,
          name: c.name,
          email: c.email,
          branch: c.branch,
          totalLeads: total,
          contacted,
          interested,
          followUps,
          converted,
          lost,
          conversionRate,
        };
      })
    );

    return performance;
  },
};
