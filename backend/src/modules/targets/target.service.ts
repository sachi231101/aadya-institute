import { AppError } from "../../middlewares/error.middleware";
import { TargetRepository } from "./target.repository";
import { TargetCalculationService } from "./target.calculation";
import { createAuditLog } from "../../utils/audit-log.util";
import { prisma } from "../../config/database";
import type { AuthUser } from "../auth/auth.types";
import type {
  CreateTargetPlanDTO,
  UpdateTargetPlanDTO,
  CreateTargetDTO,
  UpdateTargetDTO,
  QueryTargetsDTO,
  QueryIncentivesDTO,
  ApproveIncentiveDTO,
  RejectIncentiveDTO,
  PerformanceSummary,
  LeaderboardEntry,
} from "./target.types";

export const TargetService = {
  // ─── Target Plans ──────────────────────────────────────────────────────────

  async getTargetPlans(currentUser: AuthUser, status?: any) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const branchId = isCenterManager ? currentUser.branchId : undefined;

    return TargetRepository.findTargetPlans(
      currentUser.instituteId,
      branchId,
      status
    );
  },

  async getTargetPlanById(currentUser: AuthUser, id: string) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const branchId = isCenterManager ? currentUser.branchId : undefined;

    const plan = await TargetRepository.findTargetPlanById(
      id,
      currentUser.instituteId,
      branchId
    );

    if (!plan) {
      throw new AppError("Target plan not found or access denied", 404);
    }

    return plan;
  },

  async createTargetPlan(currentUser: AuthUser, dto: CreateTargetPlanDTO) {
    let branchId = dto.branchId;

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN")
    ) {
      if (branchId && branchId !== currentUser.branchId) {
        throw new AppError("Cannot create target plan for another branch", 403);
      }
      branchId = currentUser.branchId ?? undefined;
    }

    const plan = await TargetRepository.createTargetPlan(
      currentUser.instituteId,
      currentUser.userId || currentUser.id,
      { ...dto, branchId }
    );

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_PLAN_CREATED",
      entityType: "TargetPlan",
      entityId: plan.id,
      newData: plan,
    });

    return plan;
  },

  async updateTargetPlan(
    currentUser: AuthUser,
    id: string,
    dto: UpdateTargetPlanDTO
  ) {
    const existing = await this.getTargetPlanById(currentUser, id);

    if (existing.status === "LOCKED") {
      throw new AppError("Cannot modify a LOCKED target plan", 400);
    }

    await TargetRepository.updateTargetPlan(id, currentUser.instituteId, dto);
    const updated = await this.getTargetPlanById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_PLAN_UPDATED",
      entityType: "TargetPlan",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  },

  async publishTargetPlan(currentUser: AuthUser, id: string) {
    const existing = await this.getTargetPlanById(currentUser, id);

    if (existing.status === "LOCKED") {
      throw new AppError("Target plan is locked", 400);
    }

    await TargetRepository.updateTargetPlan(id, currentUser.instituteId, {
      status: "PUBLISHED",
    });

    // Also update all attached targets to PUBLISHED if they were DRAFT
    await prisma.target.updateMany({
      where: { targetPlanId: id, status: "DRAFT" },
      data: { status: "PUBLISHED" },
    });

    const updated = await this.getTargetPlanById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_PLAN_PUBLISHED",
      entityType: "TargetPlan",
      entityId: id,
      newData: { status: "PUBLISHED" },
    });

    return updated;
  },

  async activateTargetPlan(currentUser: AuthUser, id: string) {
    const existing = await this.getTargetPlanById(currentUser, id);

    if (existing.status === "LOCKED") {
      throw new AppError("Target plan is locked", 400);
    }

    await TargetRepository.updateTargetPlan(id, currentUser.instituteId, {
      status: "ACTIVE",
    });

    await prisma.target.updateMany({
      where: { targetPlanId: id },
      data: { status: "ACTIVE" },
    });

    const updated = await this.getTargetPlanById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_PLAN_ACTIVATED",
      entityType: "TargetPlan",
      entityId: id,
      newData: { status: "ACTIVE" },
    });

    return updated;
  },

  async lockTargetPlan(currentUser: AuthUser, id: string) {
    const existing = await this.getTargetPlanById(currentUser, id);

    await TargetRepository.updateTargetPlan(id, currentUser.instituteId, {
      status: "LOCKED",
    });

    await prisma.target.updateMany({
      where: { targetPlanId: id },
      data: { status: "LOCKED" },
    });

    const updated = await this.getTargetPlanById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_PLAN_LOCKED",
      entityType: "TargetPlan",
      entityId: id,
      newData: { status: "LOCKED" },
    });

    return updated;
  },

  // ─── Targets ───────────────────────────────────────────────────────────────

  async getTargets(currentUser: AuthUser, query: QueryTargetsDTO) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const allowedBranchId = isCenterManager ? currentUser.branchId : undefined;

    return TargetRepository.findTargets(
      currentUser.instituteId,
      allowedBranchId,
      query
    );
  },

  async getTargetById(currentUser: AuthUser, id: string) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const allowedBranchId = isCenterManager ? currentUser.branchId : undefined;

    const target = await TargetRepository.findTargetById(
      id,
      currentUser.instituteId,
      allowedBranchId
    );

    if (!target) {
      throw new AppError("Target not found or access denied", 404);
    }

    return target;
  },

  async createTarget(currentUser: AuthUser, dto: CreateTargetDTO) {
    let branchId = dto.branchId;

    if (
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN")
    ) {
      if (branchId && branchId !== currentUser.branchId) {
        throw new AppError("Cannot create target for another branch", 403);
      }
      branchId = currentUser.branchId ?? undefined;
    }

    if (dto.userId) {
      // Validate that user exists and belongs to institute and branch
      const targetUser = await prisma.user.findFirst({
        where: { id: dto.userId, instituteId: currentUser.instituteId },
      });
      if (!targetUser) {
        throw new AppError("Assigned user not found in this institute", 400);
      }
      if (branchId && targetUser.branchId && targetUser.branchId !== branchId) {
        throw new AppError("Assigned user does not belong to the selected branch", 400);
      }
    }

    const target = await TargetRepository.createTarget(
      currentUser.instituteId,
      currentUser.userId || currentUser.id,
      { ...dto, branchId }
    );

    if (!target) {
      throw new AppError("Failed to create target", 500);
    }

    // Compute initial progress snapshot
    const progress = await TargetCalculationService.computeTargetProgress(target);
    await TargetRepository.saveTargetProgress(progress);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_CREATED",
      entityType: "Target",
      entityId: target.id,
      newData: target,
    });

    return target;
  },

  async updateTarget(currentUser: AuthUser, id: string, dto: UpdateTargetDTO) {
    const existing = await this.getTargetById(currentUser, id);

    if (existing.status === "LOCKED") {
      throw new AppError("Cannot modify a LOCKED target", 400);
    }

    const updated = await TargetRepository.updateTarget(
      id,
      currentUser.instituteId,
      dto
    );

    if (!updated) {
      throw new AppError("Target not found", 404);
    }

    // Recalculate progress snapshot
    const progress = await TargetCalculationService.computeTargetProgress(updated);
    await TargetRepository.saveTargetProgress(progress);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_UPDATED",
      entityType: "Target",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  },

  async deleteTarget(currentUser: AuthUser, id: string) {
    const existing = await this.getTargetById(currentUser, id);

    if (existing.status === "LOCKED") {
      throw new AppError("Cannot delete a LOCKED target", 400);
    }

    await TargetRepository.deleteTarget(id, currentUser.instituteId);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "TARGET_DELETED",
      entityType: "Target",
      entityId: id,
      oldData: existing,
    });

    return { id, success: true };
  },

  async recalculateTarget(currentUser: AuthUser, id: string) {
    const target = await this.getTargetById(currentUser, id);
    const progress = await TargetCalculationService.computeTargetProgress(target);
    await TargetRepository.saveTargetProgress(progress);

    // If target has passed its end date, record incentive in PENDING_APPROVAL status
    if (new Date() >= new Date(target.endDate) && target.userId && progress.potentialIncentive > 0) {
      await TargetRepository.upsertCalculatedIncentive({
        instituteId: target.instituteId,
        branchId: target.branchId,
        targetId: target.id,
        targetPlanId: target.targetPlanId,
        userId: target.userId,
        periodStart: target.startDate,
        periodEnd: target.endDate,
        targetValue: progress.targetValue,
        achievedValue: progress.achievedValue,
        achievementPercentage: progress.achievementPercentage,
        calculatedAmount: progress.potentialIncentive,
      });
    }

    return progress;
  },

  // ─── Counselor Self-Service Views ──────────────────────────────────────────

  async getMyCurrentTargets(currentUser: AuthUser) {
    const userId = currentUser.userId || currentUser.id;
    const rawTargets = await TargetRepository.findMyActiveTargets(
      currentUser.instituteId,
      userId
    );

    // Calculate real-time live progress for each active target
    const liveTargets = await Promise.all(
      rawTargets.map(async (t) => {
        const progress = await TargetCalculationService.computeTargetProgress(t);

        const now = new Date().getTime();
        const end = new Date(t.endDate).getTime();
        const diffDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

        return {
          ...t,
          currentProgress: progress,
          daysRemaining: diffDays,
        };
      })
    );

    // Aggregate summary for counselor
    const totalPotentialIncentive = liveTargets.reduce(
      (sum, t) => sum + (t.currentProgress?.potentialIncentive || 0),
      0
    );

    return {
      targets: liveTargets,
      summary: {
        activeTargetCount: liveTargets.length,
        totalPotentialIncentive,
      },
    };
  },

  async getMyPerformanceHistory(currentUser: AuthUser) {
    const userId = currentUser.userId || currentUser.id;

    const [targets, incentives] = await Promise.all([
      TargetRepository.findTargets(currentUser.instituteId, undefined, {
        userId,
        limit: 50,
      }),
      TargetRepository.findIncentives(currentUser.instituteId, undefined, {
        userId,
        limit: 50,
      }),
    ]);

    return {
      targets: targets.data,
      incentives: incentives.data,
    };
  },

  // ─── Performance & Leaderboards ────────────────────────────────────────────

  async getPerformanceSummary(
    currentUser: AuthUser,
    branchId?: string
  ): Promise<PerformanceSummary> {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const allowedBranchId = isCenterManager ? currentUser.branchId : branchId;

    const targetsResult = await TargetRepository.findTargets(
      currentUser.instituteId,
      allowedBranchId,
      { limit: 200 }
    );

    const targets = targetsResult.data;

    let totalTargetVal = 0;
    let totalAchievedVal = 0;
    let totalPercentageSum = 0;
    let count = 0;
    let needsAttention = 0;

    const counselorMap: Record<
      string,
      {
        userId: string;
        name: string;
        branchId: string;
        branchName: string;
        targetCount: number;
        totalTarget: number;
        totalAchieved: number;
        achievementRate: number;
        potentialIncentive: number;
      }
    > = {};

    for (const t of targets) {
      const p = t.targetProgress[0];
      const targetVal = Number(t.targetValue);
      const achievedVal = p ? Number(p.achievedValue) : 0;
      const rate = p ? Number(p.achievementPercentage) : 0;
      const incentive = p ? Number(p.potentialIncentive) : 0;

      totalTargetVal += targetVal;
      totalAchievedVal += achievedVal;
      totalPercentageSum += rate;
      count++;

      if (rate < 70) {
        needsAttention++;
      }

      if (t.user) {
        const uId = t.user.id;
        if (!counselorMap[uId]) {
          counselorMap[uId] = {
            userId: uId,
            name: t.user.name,
            branchId: t.branch?.id || "",
            branchName: t.branch?.name || "All Branches",
            targetCount: 0,
            totalTarget: 0,
            totalAchieved: 0,
            achievementRate: 0,
            potentialIncentive: 0,
          };
        }

        counselorMap[uId].targetCount++;
        counselorMap[uId].totalTarget += targetVal;
        counselorMap[uId].totalAchieved += achievedVal;
        counselorMap[uId].potentialIncentive += incentive;
      }
    }

    const counselorStats = Object.values(counselorMap).map((c) => {
      const avgRate =
        c.totalTarget > 0
          ? Math.round((c.totalAchieved / c.totalTarget) * 10000) / 100
          : 0;
      return {
        ...c,
        achievementRate: avgRate,
      };
    });

    counselorStats.sort((a, b) => b.achievementRate - a.achievementRate);

    const topPerformer =
      counselorStats.length > 0
        ? {
            userId: counselorStats[0].userId,
            name: counselorStats[0].name,
            achievementRate: counselorStats[0].achievementRate,
            achievedValue: counselorStats[0].totalAchieved,
          }
        : null;

    return {
      totalTargets: count,
      totalTargetValue: totalTargetVal,
      totalAchievedValue: totalAchievedVal,
      averageAchievementRate:
        count > 0 ? Math.round((totalPercentageSum / count) * 100) / 100 : 0,
      topPerformer,
      needsAttentionCount: needsAttention,
      counselorStats,
    };
  },

  async getLeaderboard(
    currentUser: AuthUser,
    branchId?: string
  ): Promise<LeaderboardEntry[]> {
    const summary = await this.getPerformanceSummary(currentUser, branchId);

    return summary.counselorStats.map((c, index) => ({
      rank: index + 1,
      userId: c.userId,
      name: c.name,
      branchName: c.branchName,
      achievementPercentage: c.achievementRate,
      achievedCount: c.totalAchieved,
      admissionsCount: Math.round(c.totalAchieved),
      revenueCollected: c.totalAchieved,
    }));
  },

  // ─── Incentives & Approvals ────────────────────────────────────────────────

  async getIncentives(currentUser: AuthUser, query: QueryIncentivesDTO) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const allowedBranchId = isCenterManager ? currentUser.branchId : undefined;

    return TargetRepository.findIncentives(
      currentUser.instituteId,
      allowedBranchId,
      query
    );
  },

  async getIncentiveById(currentUser: AuthUser, id: string) {
    const isCenterManager =
      currentUser.roles.includes("CENTER_MANAGER") &&
      !currentUser.roles.includes("ADMIN");
    const allowedBranchId = isCenterManager ? currentUser.branchId : undefined;

    const incentive = await TargetRepository.findIncentiveById(
      id,
      currentUser.instituteId,
      allowedBranchId
    );

    if (!incentive) {
      throw new AppError("Incentive record not found or access denied", 404);
    }

    return incentive;
  },

  async approveIncentive(
    currentUser: AuthUser,
    id: string,
    dto: ApproveIncentiveDTO
  ) {
    const existing = await this.getIncentiveById(currentUser, id);

    if (existing.userId === (currentUser.userId || currentUser.id)) {
      throw new AppError("Counselor cannot approve their own incentive", 403);
    }

    const approvedAmount =
      dto.approvedAmount !== undefined
        ? dto.approvedAmount
        : Number(existing.calculatedAmount);

    await TargetRepository.updateIncentiveStatus(
      id,
      currentUser.instituteId,
      "APPROVED",
      currentUser.userId || currentUser.id,
      approvedAmount,
      dto.notes
    );

    const updated = await this.getIncentiveById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "INCENTIVE_APPROVED",
      entityType: "Incentive",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  },

  async rejectIncentive(
    currentUser: AuthUser,
    id: string,
    dto: RejectIncentiveDTO
  ) {
    const existing = await this.getIncentiveById(currentUser, id);

    if (existing.userId === (currentUser.userId || currentUser.id)) {
      throw new AppError("Counselor cannot reject their own incentive", 403);
    }

    await TargetRepository.updateIncentiveStatus(
      id,
      currentUser.instituteId,
      "REJECTED",
      currentUser.userId || currentUser.id,
      undefined,
      undefined,
      dto.reason
    );

    const updated = await this.getIncentiveById(currentUser, id);

    await createAuditLog({
      userId: currentUser.userId || currentUser.id,
      instituteId: currentUser.instituteId,
      action: "INCENTIVE_REJECTED",
      entityType: "Incentive",
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  },
};
