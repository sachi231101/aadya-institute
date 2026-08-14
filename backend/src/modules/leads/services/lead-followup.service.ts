import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { LeadActivityService } from "./lead-activity.service";
import type { AuthUser } from "../../auth/auth.types";
import type { CreateFollowUpDTO, UpdateFollowUpDTO } from "../lead.types";

export const LeadFollowupService = {
  async createFollowUp(
    leadId: string,
    currentUser: AuthUser,
    dto: CreateFollowUpDTO
  ) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new AppError("Lead not found", 404);
    }

    // Branch isolation check
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    const scheduledDate = new Date(dto.scheduledAt);
    const counsellorId = lead.assignedCounsellorId ?? currentUser.userId;

    return prisma.$transaction(async (tx) => {
      const followUp = await tx.leadFollowUp.create({
        data: {
          leadId,
          counsellorId,
          createdById: currentUser.userId,
          type: dto.type ?? "CALL",
          status: "PENDING",
          scheduledAt: scheduledDate,
          notes: dto.notes ?? null,
        },
        include: {
          counsellor: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      // Update lead's nextFollowUpAt if this is the earliest pending date
      const earliestPending = await tx.leadFollowUp.findFirst({
        where: { leadId, status: "PENDING" },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          nextFollowUpAt: earliestPending?.scheduledAt ?? scheduledDate,
          stage: ["NEW", "ASSIGNED", "CONTACTED"].includes(lead.stage)
            ? "FOLLOW_UP"
            : lead.stage,
        },
      });

      // Log activity
      await LeadActivityService.logActivity(
        leadId,
        "FOLLOW_UP_CREATED",
        `Follow-up (${dto.type ?? "CALL"}) scheduled for ${scheduledDate.toLocaleString()}`,
        {
          userId: currentUser.userId,
          description: dto.notes ?? undefined,
          metadata: { followUpId: followUp.id, scheduledAt: scheduledDate },
          tx,
        }
      );

      return followUp;
    });
  },

  async updateFollowUp(
    followUpId: string,
    currentUser: AuthUser,
    dto: UpdateFollowUpDTO
  ) {
    const followUp = await prisma.leadFollowUp.findUnique({
      where: { id: followUpId },
      include: { lead: true },
    });

    if (!followUp) {
      throw new AppError("Follow-up not found", 404);
    }

    // Branch check
    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      followUp.lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Follow-up not found", 404);
    }

    return prisma.$transaction(async (tx) => {
      const isCompleted = dto.status === "COMPLETED";
      const updatedFollowUp = await tx.leadFollowUp.update({
        where: { id: followUpId },
        data: {
          status: dto.status ?? followUp.status,
          notes: dto.notes !== undefined ? dto.notes : followUp.notes,
          outcome: dto.outcome !== undefined ? dto.outcome : followUp.outcome,
          completedAt: isCompleted ? new Date() : followUp.completedAt,
        },
      });

      // Recalculate next pending follow-up
      const nextPending = await tx.leadFollowUp.findFirst({
        where: { leadId: followUp.leadId, status: "PENDING" },
        orderBy: { scheduledAt: "asc" },
      });

      await tx.lead.update({
        where: { id: followUp.leadId },
        data: {
          nextFollowUpAt: nextPending?.scheduledAt ?? null,
          ...(isCompleted ? { lastContactedAt: new Date() } : {}),
        },
      });

      if (isCompleted) {
        await LeadActivityService.logActivity(
          followUp.leadId,
          "FOLLOW_UP_COMPLETED",
          `Follow-up marked as COMPLETED: ${dto.outcome ?? "Done"}`,
          {
            userId: currentUser.userId,
            description: dto.notes ?? undefined,
            metadata: { followUpId, outcome: dto.outcome },
            tx,
          }
        );
      }

      return updatedFollowUp;
    });
  },

  async getFollowUpsByLeadId(leadId: string) {
    return prisma.leadFollowUp.findMany({
      where: { leadId },
      include: {
        counsellor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  },

  async getFollowUpDashboard(instituteId: string, branchId?: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const baseWhere = {
      lead: {
        instituteId,
        ...(branchId ? { branchId } : {}),
        status: "ACTIVE" as const,
      },
      status: "PENDING" as const,
    };

    const [overdue, today, upcoming, overdueList, todayList, upcomingList] = await prisma.$transaction([
      prisma.leadFollowUp.count({
        where: { ...baseWhere, scheduledAt: { lt: startOfToday } },
      }),
      prisma.leadFollowUp.count({
        where: { ...baseWhere, scheduledAt: { gte: startOfToday, lte: endOfToday } },
      }),
      prisma.leadFollowUp.count({
        where: { ...baseWhere, scheduledAt: { gt: endOfToday } },
      }),
      prisma.leadFollowUp.findMany({
        where: { ...baseWhere, scheduledAt: { lt: startOfToday } },
        include: {
          lead: { select: { id: true, name: true, phoneNumber: true, stage: true, branchId: true } },
          counsellor: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: { ...baseWhere, scheduledAt: { gte: startOfToday, lte: endOfToday } },
        include: {
          lead: { select: { id: true, name: true, phoneNumber: true, stage: true, branchId: true } },
          counsellor: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: { ...baseWhere, scheduledAt: { gt: endOfToday } },
        include: {
          lead: { select: { id: true, name: true, phoneNumber: true, stage: true, branchId: true } },
          counsellor: { select: { id: true, name: true } },
        },
        take: 10,
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    return {
      summary: {
        overdue,
        today,
        upcoming,
        totalPending: overdue + today + upcoming,
      },
      lists: {
        overdue: overdueList,
        today: todayList,
        upcoming: upcomingList,
      },
    };
  },
};
