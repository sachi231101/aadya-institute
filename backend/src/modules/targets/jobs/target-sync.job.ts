import { prisma } from "../../../config/database";
import { TargetCalculationService } from "../target.calculation";
import { TargetRepository } from "../target.repository";
import { toDayEnd, toDayStart, resolveTargetLifecycleStatus } from "../target.dates";
import { logger } from "../../../config/logger";

export const targetSyncJob = async (): Promise<void> => {
  logger.info("[cron] Starting target progress sync & incentive settlement job...");

  const now = new Date();

  // Lifecycle targets: upcoming → active → completed (by calendar day in IST)
  const lifecycleTargets = await prisma.target.findMany({
    where: {
      status: { in: ["UPCOMING", "ACTIVE", "COMPLETED"] },
    },
    include: {
      incentiveRule: true,
    },
  });

  let recalculatedCount = 0;
  let activatedCount = 0;
  let settledCount = 0;
  let repairedCount = 0;

  for (const target of lifecycleTargets) {
    try {
      // Normalize stored window to full IST calendar days (repairs midnight UTC bug)
      const dayStart = toDayStart(target.startDate);
      const dayEnd = toDayEnd(target.endDate);
      const desiredStatus = resolveTargetLifecycleStatus(dayStart, dayEnd, now);

      if (
        dayStart.getTime() !== new Date(target.startDate).getTime() ||
        dayEnd.getTime() !== new Date(target.endDate).getTime()
      ) {
        await prisma.target.update({
          where: { id: target.id },
          data: { startDate: dayStart, endDate: dayEnd },
        });
        target.startDate = dayStart;
        target.endDate = dayEnd;
        repairedCount++;
      }

      if (target.status !== desiredStatus && target.status !== "LOCKED" && target.status !== "CANCELLED") {
        // Don't reopen LOCKED; for COMPLETED→ACTIVE only when day not finished
        if (target.status === "COMPLETED" && desiredStatus === "ACTIVE") {
          await prisma.target.update({
            where: { id: target.id },
            data: { status: "ACTIVE" },
          });
          target.status = "ACTIVE";
          repairedCount++;
        } else if (target.status === "UPCOMING" && desiredStatus === "ACTIVE") {
          await prisma.target.update({
            where: { id: target.id },
            data: { status: "ACTIVE" },
          });
          target.status = "ACTIVE";
          activatedCount++;
        } else if (
          (target.status === "ACTIVE" || target.status === "UPCOMING") &&
          desiredStatus === "UPCOMING"
        ) {
          await prisma.target.update({
            where: { id: target.id },
            data: { status: "UPCOMING" },
          });
          target.status = "UPCOMING";
        } else if (
          (target.status === "ACTIVE" || target.status === "UPCOMING") &&
          desiredStatus === "COMPLETED"
        ) {
          // Fall through to progress + settle below
        }
      }

      // Only compute live progress for today (ACTIVE) or while completing
      if (desiredStatus === "ACTIVE" || desiredStatus === "COMPLETED") {
        const progress = await TargetCalculationService.computeTargetProgress({
          ...target,
          startDate: dayStart,
          endDate: dayEnd,
        });
        await TargetRepository.saveTargetProgress(progress);
        recalculatedCount++;

        if (
          desiredStatus === "COMPLETED" &&
          target.status !== "COMPLETED"
        ) {
          await prisma.target.update({
            where: { id: target.id },
            data: { status: "COMPLETED" },
          });

          if (target.userId && progress.potentialIncentive > 0) {
            await TargetRepository.upsertCalculatedIncentive({
              instituteId: target.instituteId,
              branchId: target.branchId,
              targetId: target.id,
              targetPlanId: target.targetPlanId,
              userId: target.userId,
              periodStart: dayStart,
              periodEnd: dayEnd,
              targetValue: progress.targetValue,
              achievedValue: progress.achievedValue,
              achievementPercentage: progress.achievementPercentage,
              calculatedAmount: progress.potentialIncentive,
            });
            settledCount++;
          }
        }
      }
    } catch (err) {
      logger.error(
        { err, targetId: target.id },
        "[target-sync-job] Error calculating progress for target"
      );
    }
  }

  logger.info(
    {
      recalculatedCount,
      activatedCount,
      settledCount,
      repairedCount,
      total: lifecycleTargets.length,
    },
    "[cron] Target progress sync & settlement job completed"
  );
};
