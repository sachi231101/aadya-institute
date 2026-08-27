import { prisma } from "../../config/database";
import type { Target, IncentiveRule, TargetMetric } from "@prisma/client";
import type {
  IncentiveSlab,
  IncentivePercentageTier,
  CalculationResult,
} from "./target.types";
import { logger } from "../../config/logger";

export const TargetCalculationService = {
  /**
   * Calculates actual achievement value for a given target metric from source of truth records.
   */
  async calculateAchievedMetricValue(
    instituteId: string,
    metric: TargetMetric,
    startDate: Date,
    endDate: Date,
    userId?: string | null,
    branchId?: string | null
  ): Promise<number> {
    const branchFilter = branchId ? { branchId } : {};

    switch (metric) {
      case "LEADS_CREATED": {
        const count = await prisma.lead.count({
          where: {
            instituteId,
            ...branchFilter,
            createdAt: { gte: startDate, lte: endDate },
            ...(userId
              ? {
                  OR: [
                    { assignedCounsellorId: userId },
                    { createdById: userId },
                  ],
                }
              : {}),
          },
        });
        return count;
      }

      case "LEADS_CONTACTED": {
        const count = await prisma.lead.count({
          where: {
            instituteId,
            ...branchFilter,
            ...(userId ? { assignedCounsellorId: userId } : {}),
            OR: [
              { lastContactedAt: { gte: startDate, lte: endDate } },
              {
                stage: { in: ["CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERTED"] },
                updatedAt: { gte: startDate, lte: endDate },
              },
            ],
          },
        });
        return count;
      }

      case "FOLLOW_UPS": {
        const count = await prisma.leadFollowUp.count({
          where: {
            lead: { instituteId, ...branchFilter },
            status: "COMPLETED",
            completedAt: { gte: startDate, lte: endDate },
            ...(userId ? { counsellorId: userId } : {}),
          },
        });
        return count;
      }

      case "QUALIFIED_LEADS": {
        const count = await prisma.lead.count({
          where: {
            instituteId,
            ...branchFilter,
            stage: { in: ["INTERESTED", "FOLLOW_UP", "CONVERTED"] },
            ...(userId ? { assignedCounsellorId: userId } : {}),
            OR: [
              { createdAt: { gte: startDate, lte: endDate } },
              { updatedAt: { gte: startDate, lte: endDate } },
            ],
          },
        });
        return count;
      }

      case "COUNSELLING_SESSIONS": {
        const count = await prisma.leadFollowUp.count({
          where: {
            lead: { instituteId, ...branchFilter },
            type: "MEETING",
            status: "COMPLETED",
            completedAt: { gte: startDate, lte: endDate },
            ...(userId ? { counsellorId: userId } : {}),
          },
        });
        return count;
      }

      case "DEMO_SESSIONS": {
        const count = await prisma.leadActivity.count({
          where: {
            lead: { instituteId, ...branchFilter },
            createdAt: { gte: startDate, lte: endDate },
            ...(userId ? { userId } : {}),
            OR: [
              { description: { contains: "DEMO", mode: "insensitive" } },
              { title: { contains: "DEMO", mode: "insensitive" } },
            ],
          },
        });
        return count;
      }

      case "ADMISSIONS": {
        const count = await prisma.admission.count({
          where: {
            instituteId,
            ...branchFilter,
            status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
            createdAt: { gte: startDate, lte: endDate },
            ...(userId
              ? {
                  OR: [
                    { convertedFromLeads: { some: { assignedCounsellorId: userId } } },
                    { application: { enquiry: { assignedToId: userId } } },
                  ],
                }
              : {}),
          },
        });
        return count;
      }

      case "CONVERTED_LEADS": {
        const count = await prisma.lead.count({
          where: {
            instituteId,
            ...branchFilter,
            status: "CONVERTED",
            convertedAt: { gte: startDate, lte: endDate },
            ...(userId ? { assignedCounsellorId: userId } : {}),
          },
        });
        return count;
      }

      case "ADMISSION_REVENUE":
      case "FEE_COLLECTION": {
        const agg = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            instituteId,
            ...branchFilter,
            status: "SUCCESS",
            date: { gte: startDate, lte: endDate },
            ...(userId
              ? {
                  OR: [
                    { recordedById: userId },
                    { admission: { convertedFromLeads: { some: { assignedCounsellorId: userId } } } },
                    { admission: { application: { enquiry: { assignedToId: userId } } } },
                  ],
                }
              : {}),
          },
        });
        return Number(agg._sum.amount ?? 0);
      }

      default:
        return 0;
    }
  },

  /**
   * Evaluates the incentive amount earned based on the achievement rate and incentive rule.
   */
  evaluateIncentiveAmount(
    targetValue: number,
    achievedValue: number,
    achievementPercentage: number,
    rule?: IncentiveRule | null
  ): number {
    if (!rule) return 0;

    switch (rule.incentiveType) {
      case "FIXED": {
        const fixed = Number(rule.fixedAmount ?? 0);
        return achievementPercentage >= 100 ? fixed : 0;
      }

      case "SLAB": {
        const slabs = (rule.slabs as unknown as IncentiveSlab[]) || [];
        if (!Array.isArray(slabs) || slabs.length === 0) return 0;

        // Find the matching slab
        const matched = slabs.find(
          (s) =>
            achievementPercentage >= s.minPercent &&
            achievementPercentage <= s.maxPercent
        );

        return matched ? Number(matched.amount) : 0;
      }

      case "PERCENTAGE": {
        const tiers = (rule.percentages as unknown as IncentivePercentageTier[]) || [];
        if (!Array.isArray(tiers) || tiers.length === 0) return 0;

        const matchedTier = tiers.find(
          (t) =>
            achievementPercentage >= t.minPercent &&
            achievementPercentage <= t.maxPercent
        );

        if (!matchedTier || matchedTier.ratePercent <= 0) return 0;

        // Potential incentive = (achievedValue * ratePercent) / 100
        const incentive = (achievedValue * matchedTier.ratePercent) / 100;
        return Math.round(incentive * 100) / 100; // Round to 2 decimal places
      }

      default:
        return 0;
    }
  },

  /**
   * Computes complete target performance snapshot for a single target.
   */
  async computeTargetProgress(
    target: Target & { incentiveRule?: IncentiveRule | null }
  ): Promise<CalculationResult> {
    const targetVal = Number(target.targetValue);
    const achievedVal = await this.calculateAchievedMetricValue(
      target.instituteId,
      target.metric,
      target.startDate,
      target.endDate,
      target.userId,
      target.branchId
    );

    // Calculate achievement % safely (avoid division by 0)
    let percentage = 0;
    if (targetVal > 0) {
      percentage = Math.round((achievedVal / targetVal) * 10000) / 100; // 2 decimals
    } else if (achievedVal > 0) {
      percentage = 100;
    }

    const remaining = Math.max(0, Math.round((targetVal - achievedVal) * 100) / 100);

    const potentialIncentive = this.evaluateIncentiveAmount(
      targetVal,
      achievedVal,
      percentage,
      target.incentiveRule
    );

    return {
      targetId: target.id,
      userId: target.userId,
      targetValue: targetVal,
      achievedValue: achievedVal,
      achievementPercentage: percentage,
      remainingValue: remaining,
      potentialIncentive,
      calculatedAt: new Date(),
    };
  },
};
