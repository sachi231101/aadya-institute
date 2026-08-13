/**
 * WhatsApp BullMQ worker — processes queued WhatsApp notifications.
 *
 * Responsibilities:
 * 1. Read `{ notificationId }` from job payload.
 * 2. Load Notification record from DB.
 * 3. Validate status (skip if already SENT/DELIVERED/READ/CANCELLED).
 * 4. Verify recipient phone and whatsappEnabled preference.
 * 5. Verify and format required template variables.
 * 6. Update status to SENDING.
 * 7. Call whatsAppService.sendTemplate().
 * 8. Update status to SENT + record providerMessageId.
 * 9. Handle retries vs. permanent failures.
 *
 * @module workers/whatsapp.worker
 */
import { createWorker } from "../queues/queue";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { whatsAppService } from "../modules/whatsapp/whatsapp.service";
import { NotificationStatus, NON_RETRIABLE_ERROR_CODES } from "../modules/notifications/notification.constants";
import * as repo from "../modules/notifications/notification.repository";

export interface WhatsappJobData {
  notificationId: string;
}

export interface WhatsappJob {
  id: string;
  data: WhatsappJobData;
  attemptsMade: number;
  opts: { attempts?: number };
}

export const processWhatsappJob = async (job: WhatsappJob): Promise<void> => {
  const notificationId = job.data.notificationId;
  const maxAttempts = job.opts.attempts ?? env.WHATSAPP_MAX_RETRIES;
  const notification = await repo.findNotificationById(notificationId);

  if (!notification) {
    logger.error({ notificationId }, "[whatsapp.worker] Notification not found in database");
    return;
  }

  // Terminal or active processing status check
  if (
    [
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
      NotificationStatus.READ,
      NotificationStatus.CANCELLED,
    ].includes(notification.status as NotificationStatus)
  ) {
    logger.info(
      { notificationId, status: notification.status },
      "[whatsapp.worker] Notification already in terminal state — skipping"
    );
    return;
  }

  // Load recipient info
  let phone = (notification.metadata as any)?.recipientPhone;
  let name = (notification.metadata as any)?.recipientName ?? "Student";

  if (!phone && notification.student?.user) {
    phone = notification.student.user.phone;
    name = notification.student.user.name ?? name;
  } else if (!phone && notification.user) {
    phone = notification.user.phone;
    name = notification.user.name ?? name;
  }

  if (!phone) {
    logger.error({ notificationId }, "[whatsapp.worker] Recipient phone missing — marking FAILED");
    await repo.updateNotificationStatus(notificationId, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: "Recipient phone number missing",
    });
    return;
  }

  // Check preference
  const recipientUser = notification.student?.user ?? notification.user;
  if (recipientUser && recipientUser.whatsappEnabled === false) {
    logger.info({ notificationId }, "[whatsapp.worker] Recipient opted out of WhatsApp — CANCELLED");
    await repo.updateNotificationStatus(notificationId, {
      status: NotificationStatus.CANCELLED,
      errorMessage: "User opted out of WhatsApp notifications",
    });
    return;
  }

  // Check template
  const template = notification.template;
  if (!template || template.status !== "ACTIVE") {
    logger.error({ notificationId, templateId: notification.templateId }, "[whatsapp.worker] Template inactive or missing — marking FAILED");
    await repo.updateNotificationStatus(notificationId, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: "Template inactive or missing",
    });
    return;
  }

  // Prepare template variables
  const metadataParams = (notification.metadata as any)?.templateParams || {};
  const requiredVars = (template.variables as string[]) || [];

  const templateParams: string[] = [];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const val = metadataParams[varName];
    if (val !== undefined && val !== null && val !== "") {
      templateParams.push(String(val));
    } else {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    const msg = `Missing required template variables: ${missingVars.join(", ")}`;
    logger.error({ notificationId, missingVars }, `[whatsapp.worker] ${msg}`);
    await repo.updateNotificationStatus(notificationId, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: msg,
    });
    return;
  }

  // Mark status SENDING
  await repo.updateNotificationStatus(notificationId, {
    status: NotificationStatus.SENDING,
    retryCount: (notification.retryCount ?? 0) + 1,
  });

  try {
    const result = await whatsAppService.sendTemplate({
      phone,
      name,
      campaignName: template.providerTemplateName,
      templateParams,
    });

    // Mark SENT
    await repo.updateNotificationStatus(notificationId, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
      errorMessage: undefined,
    });

    logger.info(
      { notificationId, providerMessageId: result.providerMessageId },
      "[whatsapp.worker] Notification sent successfully"
    );
  } catch (err: any) {
    const errorMsg = err.message || "Unknown WhatsApp send error";
    const isNonRetriable = err.nonRetriable || NON_RETRIABLE_ERROR_CODES.has(err.code);

    logger.error(
      { notificationId, err, isNonRetriable, retryCount: notification.retryCount },
      "[whatsapp.worker] Failed to send WhatsApp notification"
    );

    if (isNonRetriable || job.attemptsMade >= maxAttempts) {
      await repo.updateNotificationStatus(notificationId, {
        status: NotificationStatus.FAILED,
        failedAt: new Date(),
        errorMessage: errorMsg,
      });
    } else {
      // Retriable error — update status & re-throw for BullMQ backoff
      await repo.updateNotificationStatus(notificationId, {
        status: NotificationStatus.QUEUED,
        errorMessage: errorMsg,
      });
      throw err;
    }
  }
};

/**
 * Initialize BullMQ worker for WhatsApp messages.
 */
export const whatsappWorker = createWorker<WhatsappJobData>(
  "whatsapp",
  async (job) => {
    logger.debug({ jobId: job.data.notificationId }, "[whatsapp.worker] Processing job");
    await processWhatsappJob(job as unknown as WhatsappJob);
  },
  { concurrency: env.WHATSAPP_QUEUE_CONCURRENCY }
);
