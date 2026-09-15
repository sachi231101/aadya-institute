/**
 * Lead follow-up reminder job — remind counsellors of follow-ups due today.
 */
import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { triggerNotification } from "../whatsapp.service";
import {
  NotificationEvent,
  NotificationChannel,
  buildIdempotencyKey,
} from "../whatsapp.constants";

export const leadFollowupReminderJob = async (): Promise<void> => {
  const rules = await prisma.notificationRule.findMany({
    where: {
      event: NotificationEvent.LEAD_FOLLOWUP_REMINDER,
      channel: NotificationChannel.WHATSAPP,
      enabled: true,
    },
  });
  if (rules.length === 0) return;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const dateKey = now.toISOString().slice(0, 10);
  const instituteIds = new Set(rules.map((r) => r.instituteId));

  const followUps = await prisma.leadFollowUp.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { gte: start, lte: end },
      lead: { instituteId: { in: Array.from(instituteIds) } },
    },
    include: {
      counsellor: { select: { id: true, name: true, phone: true } },
      lead: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          instituteId: true,
        },
      },
    },
  });

  logger.info(`[lead-followup] ${followUps.length} follow-up(s) due today`);

  for (const fu of followUps) {
    if (!instituteIds.has(fu.lead.instituteId)) continue;
    const timeLabel = fu.scheduledAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
    await triggerNotification({
      instituteId: fu.lead.instituteId,
      userId: fu.counsellorId,
      event: NotificationEvent.LEAD_FOLLOWUP_REMINDER,
      idempotencyKey: buildIdempotencyKey.LEAD_FOLLOWUP_REMINDER(
        fu.counsellorId,
        fu.id,
        dateKey
      ),
      templateParams: {
        counsellor_name: fu.counsellor?.name || "Counsellor",
        lead_name: fu.lead.name || "Lead",
        followup_time: timeLabel,
        lead_phone: fu.lead.phoneNumber || "",
      },
      metadata: { followUpId: fu.id, leadId: fu.lead.id },
    });
  }
};
