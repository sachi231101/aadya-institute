import { prisma } from "../../config/database";
import type { Prisma, LeadStatus, LeadLostReason } from "@prisma/client";
import { LeadActivityService } from "./services/lead-activity.service";
import { appendCounsellorLeadNotes } from "./utils/append-lead-notes";
import { recomputeNextFollowUpAt } from "./utils/recompute-next-follow-up-at";
import { normalizePhoneDigits } from "../../utils/phone";

export interface LeadFindManyParams {
  instituteId: string;
  branchId?: string;
  /** Multi-branch scope when user has UserBranchAccess and no single branchId. */
  branchIds?: string[];
  assignedCounsellorId?: string;
  /**
   * Counsellor list scope: assigned to this user OR unassigned and created by them.
   * Matches getLeadById creator-waiting access for post-create AI dial (pre-score assign).
   */
  counsellorVisibleId?: string;
  courseId?: string;
  stage?: string;
  /** Multi-stage filter (takes precedence over single `stage` when non-empty) */
  stages?: string[];
  stageMasterId?: string;
  status?: LeadStatus;
  /** Multi-status filter (takes precedence over single `status` when non-empty) */
  statuses?: LeadStatus[];
  source?: string;
  sourceMasterId?: string;
  search?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  scoreBand?: "hot" | "warm" | "cold" | "unscored";
  unassigned?: boolean;
  hasRemarks?: boolean;
  tag?: string;
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
  callLogs: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
} satisfies Prisma.LeadInclude;

function leadBranchWhere(
  branchId?: string,
  branchIds?: string[]
): { branchId: string } | { branchId: { in: string[] } } | Record<string, never> {
  if (branchId) return { branchId };
  if (branchIds && branchIds.length > 0) return { branchId: { in: branchIds } };
  return {};
}

export const LeadRepository = {
  async findActiveLeadByPhone(phoneNumber: string, instituteId: string) {
    const normalizedPhone = normalizePhoneDigits(phoneNumber);
    return prisma.lead.findFirst({
      where: {
        instituteId,
        status: "ACTIVE",
        OR: [
          ...(normalizedPhone ? [{ normalizedPhone }] : []),
          { phoneNumber },
        ],
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
    source: string;
    sourceMasterId?: string;
    stage: string;
    stageMasterId?: string;
    leadTypeMasterId?: string;
    priority?: string;
    notes?: string;
    tags?: string[];
    createdById: string;
    assignedCounsellorId?: string;
    importJobId?: string | null;
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
      sourceMasterId,
      stage: initialStage,
      stageMasterId,
      leadTypeMasterId,
      priority,
      notes,
      tags,
      createdById,
      assignedCounsellorId,
      importJobId,
    } = params;

    const normalizedPhone = normalizePhoneDigits(phoneNumber) || null;

    return prisma.$transaction(async (tx) => {
      // 1. Create Lead
      const lead = await tx.lead.create({
        data: {
          instituteId,
          branchId,
          importJobId: importJobId ?? null,
          name,
          phoneNumber,
          normalizedPhone,
          email: email ?? null,
          interestedIn,
          courseId: courseId ?? null,
          source,
          sourceMasterId: sourceMasterId ?? null,
          stage: initialStage,
          stageMasterId: stageMasterId ?? null,
          leadTypeMasterId: leadTypeMasterId ?? null,
          status: "ACTIVE",
          priority: priority ?? "MEDIUM",
          tags: tags ?? [],
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
        callLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async findLeads(params: LeadFindManyParams) {
    const {
      instituteId,
      branchId,
      branchIds,
      assignedCounsellorId,
      counsellorVisibleId,
      courseId,
      stage,
      stages,
      status,
      statuses,
      source,
      search,
      priority,
      dateFrom,
      dateTo,
      followUpFrom,
      followUpTo,
      scoreBand,
      unassigned,
      hasRemarks,
      tag,
      skip,
      take,
    } = params;

    const andFilters: Prisma.LeadWhereInput[] = [];

    if (counsellorVisibleId) {
      andFilters.push({
        OR: [
          { assignedCounsellorId: counsellorVisibleId },
          { assignedCounsellorId: null, createdById: counsellorVisibleId },
        ],
      });
    } else if (assignedCounsellorId) {
      andFilters.push({ assignedCounsellorId });
    }

    if (unassigned) {
      andFilters.push({ assignedCounsellorId: null });
    }

    if (hasRemarks === true) {
      andFilters.push({
        AND: [{ notes: { not: null } }, { NOT: { notes: "" } }],
      });
    }

    if (scoreBand === "hot") {
      andFilters.push({ leadScore: { gte: 70 } });
    } else if (scoreBand === "warm") {
      andFilters.push({ leadScore: { gte: 40, lte: 69 } });
    } else if (scoreBand === "cold") {
      andFilters.push({ leadScore: { gte: 1, lte: 39 } });
    } else if (scoreBand === "unscored") {
      andFilters.push({ OR: [{ leadScore: null }, { leadScore: 0 }] });
    }

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
          { interestedIn: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const stageFilter =
      stages && stages.length > 0
        ? { stage: { in: stages } }
        : stage
          ? { stage }
          : {};

    const statusFilter =
      statuses && statuses.length > 0
        ? { status: { in: statuses } }
        : status
          ? { status }
          : {};

    const where: Prisma.LeadWhereInput = {
      instituteId,
      ...leadBranchWhere(branchId, branchIds),
      ...(courseId ? { courseId } : {}),
      ...stageFilter,
      ...(params.stageMasterId ? { stageMasterId: params.stageMasterId } : {}),
      ...statusFilter,
      ...(source ? { source } : {}),
      ...(params.sourceMasterId ? { sourceMasterId: params.sourceMasterId } : {}),
      ...(priority ? { priority } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    // Overdue path (frontend sends followUpTo alone): PENDING tasks before start of today.
    // Date-range path (both from/to): keep nextFollowUpAt window filter.
    if (followUpTo && !followUpFrom) {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      andFilters.push({
        followUps: {
          some: {
            status: "PENDING",
            scheduledAt: { lt: startOfToday },
          },
        },
      });
      where.AND = andFilters;
    } else if (followUpFrom || followUpTo) {
      where.nextFollowUpAt = {
        ...(followUpFrom ? { gte: new Date(followUpFrom) } : {}),
        ...(followUpTo ? { lte: new Date(followUpTo) } : {}),
      };
    }

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        include: leadInclude,
        // LOST / CONVERTED after ACTIVE (enum alpha: ACTIVE < CONVERTED < LOST)
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
    newStage: string,
    changedById: string,
    notes?: string,
    stageMasterId?: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return null;

    const oldStage = lead.stage;

    return prisma.$transaction(async (tx) => {
      const appendedNotes = appendCounsellorLeadNotes(lead.notes, notes);

      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: newStage,
          ...(stageMasterId ? { stageMasterId } : {}),
          ...(newStage === "CONTACTED" && !lead.lastContactedAt
            ? { lastContactedAt: new Date() }
            : {}),
          ...(appendedNotes !== undefined ? { notes: appendedNotes } : {}),
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
      await tx.leadFollowUp.updateMany({
        where: { leadId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: "LOST",
          status: "LOST",
          lostAt: new Date(),
          lostReason: reason,
          lostNotes: notes ?? null,
          nextFollowUpAt: null,
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

  async getDashboardSummary(
    instituteId: string,
    branchId?: string,
    branchIds?: string[]
  ) {
    const baseWhere = {
      instituteId,
      ...leadBranchWhere(branchId, branchIds),
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const activeWhere = { ...baseWhere, status: "ACTIVE" as const };

    const [
      totalLeads,
      newCount,
      assignedCount,
      contactedCount,
      interestedCount,
      followUpCount,
      convertedCount,
      lostCount,
      hot,
      warm,
      cold,
      unassigned,
      todayCreated,
      overdueFollowUps,
    ] = await prisma.$transaction([
      prisma.lead.count({ where: activeWhere }),
      prisma.lead.count({ where: { ...baseWhere, stage: "NEW" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "ASSIGNED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "CONTACTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "INTERESTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "FOLLOW_UP" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "CONVERTED" } }),
      prisma.lead.count({ where: { ...baseWhere, stage: "LOST" } }),
      prisma.lead.count({ where: { ...activeWhere, leadScore: { gte: 70 } } }),
      prisma.lead.count({ where: { ...activeWhere, leadScore: { gte: 40, lte: 69 } } }),
      prisma.lead.count({ where: { ...activeWhere, leadScore: { gte: 1, lte: 39 } } }),
      prisma.lead.count({ where: { ...activeWhere, assignedCounsellorId: null } }),
      prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.leadFollowUp.count({
        where: {
          status: "PENDING",
          scheduledAt: { lt: startOfToday },
          lead: activeWhere,
        },
      }),
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
      hot,
      warm,
      cold,
      unassigned,
      todayCreated,
      overdueFollowUps,
    };
  },

  async getCounsellorPerformance(
    instituteId: string,
    branchId?: string,
    branchIds?: string[]
  ) {
    const counsellors = await prisma.user.findMany({
      where: {
        instituteId,
        ...leadBranchWhere(branchId, branchIds),
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
          ...leadBranchWhere(branchId, branchIds),
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

  async findCallHistory(params: {
    instituteId: string;
    branchId?: string;
    branchIds?: string[];
    counsellorVisibleId?: string;
    leadId?: string;
    studentId?: string;
    status?: string;
    statuses?: string[];
    callType?: "ALL" | "AI" | "MANUAL";
    search?: string;
    skip: number;
    take: number;
  }) {
    const {
      instituteId,
      branchId,
      branchIds,
      counsellorVisibleId,
      leadId,
      studentId,
      status,
      statuses,
      callType = "ALL",
      search,
      skip,
      take,
    } = params;

    const branchFilter = leadBranchWhere(branchId, branchIds);
    const statusList =
      statuses && statuses.length > 0
        ? statuses
        : status
          ? [status]
          : undefined;

    const counsellorLeadFilter: Prisma.LeadWhereInput | undefined =
      counsellorVisibleId
        ? {
            OR: [
              { assignedCounsellorId: counsellorVisibleId },
              { assignedCounsellorId: null, createdById: counsellorVisibleId },
            ],
          }
        : undefined;

    const where: Prisma.CallLogWhereInput = {
      instituteId,
      ...(statusList ? { status: { in: statusList } } : {}),
      ...(callType && callType !== "ALL" ? { callType } : {}),
    };

    if (leadId) {
      where.leadId = leadId;
      where.lead = {
        instituteId,
        ...branchFilter,
        ...(counsellorLeadFilter ?? {}),
      };
    } else if (studentId) {
      where.studentId = studentId;
      where.student = { instituteId, ...branchFilter };
    } else if (branchId) {
      where.OR = [
        { branchId },
        {
          lead: {
            instituteId,
            branchId,
            ...(counsellorLeadFilter ?? {}),
          },
        },
        { student: { instituteId, branchId } },
      ];
    } else if (branchIds && branchIds.length > 0) {
      where.OR = [
        { branchId: { in: branchIds } },
        {
          lead: {
            instituteId,
            branchId: { in: branchIds },
            ...(counsellorLeadFilter ?? {}),
          },
        },
        { student: { instituteId, branchId: { in: branchIds } } },
      ];
    } else if (counsellorVisibleId) {
      where.lead = {
        instituteId,
        ...counsellorLeadFilter!,
      };
    }

    if (search) {
      const leadSearch: Prisma.LeadWhereInput = {
        instituteId,
        ...branchFilter,
        ...(counsellorLeadFilter ?? {}),
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search } },
        ],
      };
      where.lead = where.lead
        ? { AND: [where.lead as Prisma.LeadWhereInput, leadSearch] }
        : leadSearch;
    }

    const [total, data] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              branchId: true,
              leadScore: true,
              leadTemperature: true,
              leadIntent: true,
              assignedCounsellorId: true,
              assignedCounsellor: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true, code: true } },
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              branchId: true,
              branch: { select: { id: true, name: true, code: true } },
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          caller: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return { total, data };
  },

  async archiveLead(leadId: string, archivedById: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: { status: "ARCHIVED" },
        include: leadInclude,
      });

      await LeadActivityService.logActivity(
        leadId,
        "ARCHIVED",
        "Lead archived",
        {
          userId: archivedById,
          description: "Lead soft-archived (status set to ARCHIVED)",
          tx,
        }
      );

      return updated;
    });
  },

  async mergeLeads(params: {
    primaryLeadId: string;
    duplicateLeadId: string;
    mergedById: string;
  }) {
    const { primaryLeadId, duplicateLeadId, mergedById } = params;

    return prisma.$transaction(async (tx) => {
      const [primary, duplicate] = await Promise.all([
        tx.lead.findUnique({ where: { id: primaryLeadId } }),
        tx.lead.findUnique({ where: { id: duplicateLeadId } }),
      ]);

      if (!primary || !duplicate) {
        return null;
      }

      await tx.callLog.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });
      await tx.leadFollowUp.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });
      await tx.leadActivity.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });
      await tx.leadAssignment.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId, isCurrent: false, unassignedAt: new Date() },
      });
      await tx.leadStageHistory.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });
      await tx.application.updateMany({
        where: { leadId: duplicateLeadId },
        data: { leadId: primaryLeadId },
      });

      const mergedTags = Array.from(
        new Set([...(primary.tags ?? []), ...(duplicate.tags ?? [])])
      );

      const lastContactedAt =
        [primary.lastContactedAt, duplicate.lastContactedAt]
          .filter(Boolean)
          .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ??
        null;

      await tx.lead.update({
        where: { id: duplicateLeadId },
        data: {
          status: "ARCHIVED",
          stage: "LOST",
          lostAt: new Date(),
          lostReason: "OTHER",
          lostNotes: `Merged into lead ${primaryLeadId}`,
          assignedCounsellorId: null,
          nextFollowUpAt: null,
        },
      });

      const updatedPrimary = await tx.lead.update({
        where: { id: primaryLeadId },
        data: {
          tags: mergedTags,
          notes: [primary.notes, duplicate.notes].filter(Boolean).join("\n---\n") || primary.notes,
          leadScore: primary.leadScore ?? duplicate.leadScore,
          admissionProbability:
            primary.admissionProbability ?? duplicate.admissionProbability,
          nextBestAction: primary.nextBestAction ?? duplicate.nextBestAction,
          assignedCounsellorId:
            primary.assignedCounsellorId ?? duplicate.assignedCounsellorId,
          lastContactedAt,
        },
        include: leadInclude,
      });

      await recomputeNextFollowUpAt(primaryLeadId, tx);

      const refreshedPrimary = await tx.lead.findUnique({
        where: { id: primaryLeadId },
        include: leadInclude,
      });

      await LeadActivityService.logActivity(
        primaryLeadId,
        "MERGED",
        `Merged duplicate lead ${duplicate.name}`,
        {
          userId: mergedById,
          description: `Duplicate lead ${duplicateLeadId} archived and relations moved`,
          metadata: { duplicateLeadId, duplicateName: duplicate.name },
          tx,
        }
      );

      await LeadActivityService.logActivity(
        duplicateLeadId,
        "MERGED",
        `Merged into primary lead ${primary.name}`,
        {
          userId: mergedById,
          description: `Merged into ${primaryLeadId}`,
          metadata: { primaryLeadId },
          tx,
        }
      );

      return {
        primary: refreshedPrimary ?? updatedPrimary,
        duplicateId: duplicateLeadId,
      };
    });
  },
};
