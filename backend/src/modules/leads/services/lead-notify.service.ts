import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { NotificationService } from "../../notifications/notification.service";

/**
 * In-app notifications for lead assignment and AI auto follow-ups.
 * WhatsApp is intentionally not used — no lead-assign / follow-up templates exist.
 */
export const LeadNotifyService = {
  async notifyLeadAssigned(params: {
    instituteId: string;
    branchId: string | null;
    leadId: string;
    leadName: string;
    counsellorId: string;
    assignedByName?: string | null;
  }): Promise<void> {
    const { instituteId, branchId, leadId, leadName, counsellorId, assignedByName } =
      params;

    try {
      await NotificationService.createNotification({
        userId: counsellorId,
        instituteId,
        branchId: branchId ?? undefined,
        title: "New lead assigned",
        message: assignedByName
          ? `${leadName} was assigned to you by ${assignedByName}.`
          : `${leadName} was assigned to you.`,
        type: "AI_CALL",
        module: "leads",
        link: `/counselor/leads/${leadId}`,
        metadata: { leadId, event: "LEAD_ASSIGNED" },
      });
    } catch (err) {
      logger.error(
        { err, leadId, counsellorId },
        "[LeadNotify] Failed to notify counsellor of assignment"
      );
    }
  },

  async notifyFollowUpCreated(params: {
    instituteId: string;
    branchId: string | null;
    leadId: string;
    leadName: string;
    assignedCounsellorId: string | null;
    followUpId: string;
    scheduledAt: Date;
    priority: string;
  }): Promise<void> {
    const {
      instituteId,
      branchId,
      leadId,
      leadName,
      assignedCounsellorId,
      followUpId,
      scheduledAt,
      priority,
    } = params;

    const when = scheduledAt.toISOString();
    const message = `AI created a ${priority.toLowerCase()}-priority follow-up for ${leadName} (due ${when}).`;

    try {
      if (assignedCounsellorId) {
        await NotificationService.createNotification({
          userId: assignedCounsellorId,
          instituteId,
          branchId: branchId ?? undefined,
          title: "AI follow-up created",
          message,
          type: "AI_CALL",
          module: "leads",
          link: `/counselor/leads/${leadId}`,
          metadata: {
            leadId,
            followUpId,
            event: "FOLLOW_UP_CREATED",
          },
        });
        return;
      }

      const managerIds = await this.findBranchManagerIds(instituteId, branchId);
      await Promise.all(
        managerIds.map((userId) =>
          NotificationService.createNotification({
            userId,
            instituteId,
            branchId: branchId ?? undefined,
            title: "AI follow-up created (unassigned lead)",
            message,
            type: "AI_CALL",
            module: "leads",
            link: `/center/leads/${leadId}`,
            metadata: {
              leadId,
              followUpId,
              event: "FOLLOW_UP_CREATED",
              unassigned: true,
            },
          })
        )
      );
    } catch (err) {
      logger.error(
        { err, leadId, followUpId },
        "[LeadNotify] Failed to notify on AI follow-up"
      );
    }
  },

  async findBranchManagerIds(
    instituteId: string,
    branchId: string | null
  ): Promise<string[]> {
    const managers = await prisma.user.findMany({
      where: {
        instituteId,
        status: "ACTIVE",
        ...(branchId ? { branchId } : {}),
        userRoles: {
          some: { role: { name: "CENTER_MANAGER" } },
        },
      },
      select: { id: true },
    });
    return managers.map((m) => m.id);
  },
};
