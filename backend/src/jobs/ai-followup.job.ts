import { aiCallingQueue } from "../queues/ai-calling.queue";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

/**
 * Enqueues AI follow-up calls for inactive leads.
 */
export const aiFollowupJob = async (): Promise<void> => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const admissions = await prisma.admission.findMany({
    where: {
      status: "PENDING",
      updatedAt: { lte: twoDaysAgo },
    },
    include: {
      student: { include: { user: true } },
    },
    take: 50, // limit per run
  });

  logger.info(`[ai-followup] ${admissions.length} pending admissions to follow up`);

  for (const admission of admissions) {
    const phone = admission.student?.user?.phone;
    if (!phone) continue;

    await aiCallingQueue.add("ai-followup", {
      to: phone,
      from: process.env.AI_CALLER_NUMBER || "",
      callbackUrl: `${process.env.APP_URL}/api/v1/webhooks/ai-calling/callback`,
      studentId: admission.studentId,
    });
  }
};
