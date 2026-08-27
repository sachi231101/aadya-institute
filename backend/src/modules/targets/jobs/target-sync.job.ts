import { prisma } from "../../../config/database";
import { TargetCalculationService } from "../target.calculation";
import { TargetRepository } from "../target.repository";
import { logger } from "../../../config/logger";

export const targetSyncJob = async (): Promise<void> => {
  logger.info("[cron] Starting target progress sync & incentive settlement job...");

  const now = new Date();

  // Find all ACTIVE targets
  const activeTargets = await prisma.target.findMany({
    where: { status: "ACTIVE" },
    include: {
      incentiveRule: true,
    },
  });

  let recalculatedCount = 0;
  let settledCount = 0;

  for (const target of activeTargets) {
    try {
      const progress = await TargetCalculationService.computeTargetProgress(target);
      await TargetRepository.saveTargetProgress(progress);
      recalculatedCount++;

      // Check if target period has ended
      if (now >= new Date(target.endDate)) {
        // Mark target as COMPLETED
        await prisma.target.update({
          where: { id: target.id },
          data: { status: "COMPLETED" },
        });

        // If target was assigned to an individual counselor and earned incentive, create PENDING_APPROVAL incentive
        if (target.userId && progress.potentialIncentive > 0) {
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
          settledCount++;
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
    { recalculatedCount, settledCount, totalActive: activeTargets.length },
    "[cron] Target progress sync & settlement job completed"
  );
};
