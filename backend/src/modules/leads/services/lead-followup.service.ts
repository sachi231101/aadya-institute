import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { LeadActivityService } from "./lead-activity.service";
import type { AuthUser } from "../../auth/auth.types";
import type { CreateFollowUpDTO, UpdateFollowUpDTO } from "../lead.types";

const followUpInclude = {
  lead: {
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      stage: true,
      branchId: true,
      leadScore: true,
      priority: true,
      assignedCounsellorId: true,
    },
  },
  counsellor: { select: { id: true, name: true } },
} as const;

const PRIORITY_RANK: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

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

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    const scheduledDate = new Date(dto.scheduledAt);
    const counsellorId =
      dto.counsellorId ||
      lead.assignedCounsellorId ||
      currentUser.userId ||
      currentUser.id;

    return prisma.$transaction(async (tx) => {
      const followUp = await tx.leadFollowUp.create({
        data: {
          leadId,
          counsellorId,
          createdById: currentUser.userId || currentUser.id,
          type: dto.type ?? "CALL",
          status: "PENDING",
          priority: dto.priority ?? "MEDIUM",
          scheduledAt: scheduledDate,
          notes: dto.notes ?? null,
        },
        include: {
          counsellor: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

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
          priority: dto.priority ?? followUp.priority,
          scheduledAt: dto.scheduledAt
            ? new Date(dto.scheduledAt)
            : followUp.scheduledAt,
          completedAt: isCompleted ? new Date() : followUp.completedAt,
        },
      });

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

  async getFollowUpDashboard(
    instituteId: string,
    branchId?: string,
    currentUserId?: string
  ) {
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    const leadScope = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      status: "ACTIVE" as const,
    };

    const pendingBase = {
      lead: leadScope,
      status: "PENDING" as const,
    };

    const completedBase = {
      lead: leadScope,
      status: "COMPLETED" as const,
    };

    const listTake = 50;

    const [
      overdue,
      today,
      upcoming,
      completedCount,
      overdueList,
      todayList,
      upcomingList,
      completedList,
      allPending,
    ] = await prisma.$transaction([
      prisma.leadFollowUp.count({
        where: { ...pendingBase, scheduledAt: { lt: startOfToday } },
      }),
      prisma.leadFollowUp.count({
        where: {
          ...pendingBase,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.leadFollowUp.count({
        where: { ...pendingBase, scheduledAt: { gt: endOfToday } },
      }),
      prisma.leadFollowUp.count({ where: completedBase }),
      prisma.leadFollowUp.findMany({
        where: { ...pendingBase, scheduledAt: { lt: startOfToday } },
        include: followUpInclude,
        take: listTake,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: {
          ...pendingBase,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
        include: followUpInclude,
        take: listTake,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: { ...pendingBase, scheduledAt: { gt: endOfToday } },
        include: followUpInclude,
        take: listTake,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: completedBase,
        include: followUpInclude,
        take: listTake,
        orderBy: { completedAt: "desc" },
      }),
      prisma.leadFollowUp.findMany({
        where: pendingBase,
        include: followUpInclude,
        take: 200,
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    const myList = currentUserId
      ? allPending.filter((f) => f.counsellorId === currentUserId)
      : [];
    const teamList = currentUserId
      ? allPending.filter((f) => f.counsellorId !== currentUserId)
      : allPending;

    const hotWithPending = allPending.filter(
      (f) => (f.lead.leadScore ?? 0) >= 70
    ).length;
    const highRisk = allPending.filter((f) => {
      const isOverdue = f.scheduledAt < startOfToday;
      const highPriority = f.priority === "HIGH";
      const hotScore = (f.lead.leadScore ?? 0) >= 70;
      return isOverdue && (highPriority || hotScore);
    }).length;

    const recommended = [...allPending]
      .sort((a, b) => {
        const aOverdue = a.scheduledAt < startOfToday ? 1 : 0;
        const bOverdue = b.scheduledAt < startOfToday ? 1 : 0;
        if (bOverdue !== aOverdue) return bOverdue - aOverdue;

        const scoreDiff = (b.lead.leadScore ?? 0) - (a.lead.leadScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;

        const pDiff =
          (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
        if (pDiff !== 0) return pDiff;

        if (a.recommendedRank != null && b.recommendedRank != null) {
          return a.recommendedRank - b.recommendedRank;
        }

        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      })
      .slice(0, 20);

    return {
      summary: {
        overdue,
        today,
        upcoming,
        completed: completedCount,
        totalPending: overdue + today + upcoming,
        hotWithPending,
        highRisk,
      },
      highlights: {
        overdue,
        hot: hotWithPending,
        highRisk,
        today,
      },
      lists: {
        overdue: overdueList,
        today: todayList,
        upcoming: upcomingList,
        completed: completedList,
        my: myList.slice(0, listTake),
        team: teamList.slice(0, listTake),
        recommended,
      },
    };
  },
};
