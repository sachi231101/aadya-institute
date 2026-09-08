import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { resolveAiCallingConfig } from "../modules/ai-calling/ai-calling.config";
import { AiCallingService } from "../modules/ai-calling/ai-calling.service";

/**
 * Enqueues AI follow-up calls for inactive pending admissions — institute-scoped.
 * Uses the multi-tenant dialer (CallLog + /webhooks/sarvam/callback).
 * Skips institutes without enabled AI Calling config.
 */
export const aiFollowupJob = async (): Promise<void> => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const admissions = await prisma.admission.findMany({
    where: {
      status: "PENDING",
      updatedAt: { lte: twoDaysAgo },
    },
    include: {
      student: {
        include: { user: true },
      },
    },
    take: 50,
  });

  logger.info(`[ai-followup] ${admissions.length} pending admissions to follow up`);

  let enqueued = 0;
  let skipped = 0;

  for (const admission of admissions) {
    const phone = admission.student?.user?.phone;
    const instituteId = admission.instituteId || admission.student?.instituteId;
    if (!phone || !instituteId) {
      skipped++;
      continue;
    }

    try {
      const config = await resolveAiCallingConfig(instituteId);
      if (!config.isEnabled || !config.hasTelephony) {
        skipped++;
        continue;
      }

      const digits = phone.replace(/\D/g, "").slice(-10);
      const lead = await prisma.lead.findFirst({
        where: {
          instituteId,
          status: "ACTIVE",
          OR: [{ normalizedPhone: digits }, { phoneNumber: { contains: digits } }],
        },
      });

      if (!lead) {
        skipped++;
        continue;
      }

      const result = await AiCallingService.enqueueLeadCall({
        id: lead.id,
        phoneNumber: lead.phoneNumber,
        createdById: lead.createdById,
        instituteId: lead.instituteId,
        branchId: lead.branchId,
        importJobId: lead.importJobId,
      });

      if (result.queued) enqueued++;
      else skipped++;
    } catch (err) {
      logger.error(
        { err, admissionId: admission.id },
        "[ai-followup] Failed to enqueue follow-up call"
      );
      skipped++;
    }
  }

  logger.info(
    { enqueued, skipped },
    "[ai-followup] Completed institute-scoped follow-up pass"
  );
};
