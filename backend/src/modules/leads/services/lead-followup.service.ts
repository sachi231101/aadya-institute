import { prisma } from "../../../config/database";
import { AppError } from "../../../middlewares/error.middleware";
import { LeadActivityService } from "./lead-activity.service";
import type { AuthUser } from "../../auth/auth.types";
import type { CreateFollowUpDTO, UpdateFollowUpDTO } from "../lead.types";
import { appendCounsellorLeadNotes } from "../utils/append-lead-notes";
import { recomputeNextFollowUpAt } from "../utils/recompute-next-follow-up-at";
import { triggerNotification } from "../../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../../whatsapp/whatsapp.constants";

/** Non-terminal stages that move to FOLLOW_UP when a task is scheduled. */
const STAGES_TO_FOLLOW_UP = new Set([
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "INTERESTED",
]);

const followUpInclude = {
  lead: {
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      stage: true,
      branchId: true,
      leadScore: true,
      notes: true,
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

    if (lead.status === "CONVERTED" || lead.status === "LOST") {
      throw new AppError(
        "Cannot create follow-up for a converted or lost lead",
        400
      );
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

      const appendedNotes = appendCounsellorLeadNotes(lead.notes, dto.notes);
      const moveToFollowUp = STAGES_TO_FOLLOW_UP.has(lead.stage);
      const nextStage = moveToFollowUp ? "FOLLOW_UP" : lead.stage;

      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: nextStage,
          ...(appendedNotes !== undefined ? { notes: appendedNotes } : {}),
        },
      });

      // Required so last-FU complete can restore INTERESTED/CONTACTED/etc.
      if (moveToFollowUp) {
        await tx.leadStageHistory.create({
          data: {
            leadId,
            fromStage: lead.stage,
            toStage: "FOLLOW_UP",
            changedById: currentUser.userId || currentUser.id,
            notes: "Follow-up scheduled",
          },
        });
        await LeadActivityService.logActivity(
          leadId,
          "STAGE_CHANGED",
          `Stage changed from ${lead.stage} to FOLLOW_UP`,
          {
            userId: currentUser.userId,
            description: "Follow-up scheduled",
            metadata: {
              fromStage: lead.stage,
              toStage: "FOLLOW_UP",
              followUpId: followUp.id,
            },
            tx,
          }
        );
      }

      await recomputeNextFollowUpAt(leadId, tx);

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
    }).then(async (followUp) => {
      const type = String(dto.type ?? "CALL").toUpperCase();
      if (["DEMO", "WHATSAPP", "MEETING", "VISIT", "REMINDER"].includes(type) && lead.phoneNumber) {
        setImmediate(() => {
          void triggerNotification({
            instituteId: lead.instituteId,
            event: NotificationEvent.DEMO_SCHEDULED,
            idempotencyKey: buildIdempotencyKey.DEMO_SCHEDULED(leadId, followUp.id),
            recipientPhone: lead.phoneNumber,
            recipientName: lead.name || "Lead",
            templateParams: {
              lead_name: lead.name || "Lead",
              scheduled_at: scheduledDate.toLocaleString("en-IN"),
              course_name: lead.interestedIn || "Course",
              counsellor_name: followUp.counsellor?.name || "Counsellor",
            },
            metadata: { leadId, followUpId: followUp.id, type },
          }).catch(() => {});
        });
      }
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

      const appendedNotes = appendCounsellorLeadNotes(
        followUp.lead.notes,
        dto.notes
      );

      const completedLastPending =
        isCompleted && !nextPending && followUp.lead.stage === "FOLLOW_UP";

      let restoreStage: string | undefined;
      if (completedLastPending) {
        const priorHistory = await tx.leadStageHistory.findFirst({
          where: { leadId: followUp.leadId, toStage: "FOLLOW_UP" },
          orderBy: { createdAt: "desc" },
        });
        const fromStage = priorHistory?.fromStage;
        restoreStage =
          fromStage && fromStage !== "FOLLOW_UP" ? fromStage : "CONTACTED";
      }

      await tx.lead.update({
        where: { id: followUp.leadId },
        data: {
          ...(isCompleted ? { lastContactedAt: new Date() } : {}),
          ...(restoreStage ? { stage: restoreStage } : {}),
          ...(appendedNotes !== undefined ? { notes: appendedNotes } : {}),
        },
      });

      await recomputeNextFollowUpAt(followUp.leadId, tx);

      if (completedLastPending && restoreStage) {
        await tx.leadStageHistory.create({
          data: {
            leadId: followUp.leadId,
            fromStage: "FOLLOW_UP",
            toStage: restoreStage,
            changedById: currentUser.userId || currentUser.id,
            notes: "Last pending follow-up completed",
          },
        });
        await LeadActivityService.logActivity(
          followUp.leadId,
          "STAGE_CHANGED",
          `Stage changed from FOLLOW_UP to ${restoreStage}`,
          {
            userId: currentUser.userId,
            description: "Last pending follow-up completed",
            metadata: {
              fromStage: "FOLLOW_UP",
              toStage: restoreStage,
              followUpId,
            },
            tx,
          }
        );
      }

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
    currentUserId?: string,
    options?: {
      branchIds?: string[];
      scopeToAssignee?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const leadBranch =
      branchId
        ? { branchId }
        : options?.branchIds && options.branchIds.length > 0
          ? { branchId: { in: options.branchIds } }
          : {};

    const leadScope = {
      instituteId,
      ...leadBranch,
      status: "ACTIVE" as const,
    };

    const assigneeFilter =
      options?.scopeToAssignee && currentUserId
        ? { counsellorId: currentUserId }
        : {};

    const pendingBase = {
      lead: leadScope,
      status: "PENDING" as const,
      ...assigneeFilter,
    };

    const completedBase = {
      lead: leadScope,
      status: "COMPLETED" as const,
      ...assigneeFilter,
    };

    // My/team ignore scopeToAssignee assigneeFilter on purpose for managers;
    // for counsellor-only, team is forced empty via impossible id filter.
    const myPendingWhere = currentUserId
      ? {
          lead: leadScope,
          status: "PENDING" as const,
          counsellorId: currentUserId,
        }
      : pendingBase;

    const teamPendingWhere = options?.scopeToAssignee
      ? {
          lead: leadScope,
          status: "PENDING" as const,
          id: "__no_team_for_counsellor__",
        }
      : currentUserId
        ? {
            lead: leadScope,
            status: "PENDING" as const,
            counsellorId: { not: currentUserId },
          }
        : pendingBase;

    const [
      overdue,
      today,
      upcoming,
      completedCount,
      myCount,
      teamCount,
      overdueList,
      todayList,
      upcomingList,
      completedList,
      allPendingList,
      myList,
      teamList,
      highlightPending,
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
      prisma.leadFollowUp.count({ where: myPendingWhere }),
      prisma.leadFollowUp.count({ where: teamPendingWhere }),
      prisma.leadFollowUp.findMany({
        where: { ...pendingBase, scheduledAt: { lt: startOfToday } },
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: {
          ...pendingBase,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
        },
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: { ...pendingBase, scheduledAt: { gt: endOfToday } },
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: completedBase,
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { completedAt: "desc" },
      }),
      // "All" tab: full pending pool, paginated
      prisma.leadFollowUp.findMany({
        where: pendingBase,
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: myPendingWhere,
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.leadFollowUp.findMany({
        where: teamPendingWhere,
        include: followUpInclude,
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
      // Highlights / recommended sample (not paginated)
      prisma.leadFollowUp.findMany({
        where: pendingBase,
        include: followUpInclude,
        take: 200,
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    const hotWithPending = highlightPending.filter(
      (f) => (f.lead.leadScore ?? 0) >= 70
    ).length;
    const highRisk = highlightPending.filter((f) => {
      const isOverdue = f.scheduledAt < startOfToday;
      const highPriority = f.priority === "HIGH";
      const hotScore = (f.lead.leadScore ?? 0) >= 70;
      return isOverdue && (highPriority || hotScore);
    }).length;

    const recommended = [...highlightPending]
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

    const totalPending = overdue + today + upcoming;

    return {
      summary: {
        overdue,
        today,
        upcoming,
        completed: completedCount,
        totalPending,
        my: myCount,
        team: teamCount,
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
        all: allPendingList,
        completed: completedList,
        my: myList,
        team: teamList,
        recommended,
      },
      meta: {
        page,
        limit,
        totalPages: Math.max(
          1,
          Math.ceil(
            Math.max(
              overdue,
              today,
              upcoming,
              completedCount,
              totalPending,
              myCount,
              teamCount
            ) / limit
          )
        ),
      },
    };
  },
};
