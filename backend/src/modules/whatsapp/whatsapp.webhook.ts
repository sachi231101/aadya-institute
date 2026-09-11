/**
 * WhatsApp Webhook verification (GET) and status callback handler (POST).
 *
 * Configured in MSG91 Dashboard (WhatsApp → Webhook outbound):
 *   URL: <APP_URL>/api/v1/webhooks/whatsapp
 *
 * Handles status events: submitted, sent, delivered, read, failed.
 *
 * @module modules/whatsapp/whatsapp.webhook
 */
import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { NotificationStatus } from "./whatsapp.constants";
import { env } from "../../config/env";
import { mapMsg91StatusToNotification } from "./integrations/msg91.status";

const VERIFY_TOKEN = env.WHATSAPP_WEBHOOK_SECRET || "aadya_secret_webhook_token";

export const whatsappWebhookVerify = (req: Request, res: Response): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(200).json({ status: "WhatsApp Webhook Active" });
  }
};

interface StatusEvent {
  providerMessageId?: string;
  crqid?: string;
  status?: string;
  reason?: string;
}

const extractMessageId = (m: Record<string, any>): string | undefined =>
  m?.providerMessageId ||
  m?.request_id ||
  m?.requestId ||
  m?.message_uuid ||
  m?.message_id ||
  m?.messageId ||
  m?.uuid ||
  m?.msgId ||
  m?.id;

const extractCrqid = (m: Record<string, any>): string | undefined =>
  m?.crqid || m?.CRQID || m?.crqId;

const extractStatus = (m: Record<string, any>): string | undefined =>
  m?.status || m?.eventName || m?.event || m?.type;

const extractReason = (m: Record<string, any>): string | undefined =>
  m?.reason || m?.error || m?.errorMessage || m?.failureResponse?.message;

const toStatusEvent = (m: Record<string, any>): StatusEvent => {
  if (typeof m !== "object" || m === null) return {};
  return {
    providerMessageId: extractMessageId(m) ? String(extractMessageId(m)) : undefined,
    crqid: extractCrqid(m) ? String(extractCrqid(m)) : undefined,
    status: extractStatus(m),
    reason: extractReason(m),
  };
};

const collectStatusEvents = (body: any): StatusEvent[] => {
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body)) return body.map(toStatusEvent);
  if (Array.isArray(body.messages)) return body.messages.map(toStatusEvent);
  if (Array.isArray(body.data)) return body.data.map(toStatusEvent);
  return [toStatusEvent(body)];
};

const buildUpdateForStatus = (
  notification: {
    status: string;
    deliveredAt?: Date | null;
    sentAt?: Date | null;
    readAt?: Date | null;
  },
  statusRaw: string,
  reason?: string
): Record<string, unknown> => {
  const mapped = mapMsg91StatusToNotification(statusRaw);
  if (!mapped) return {};

  const currentStatus = notification.status as NotificationStatus;
  const now = new Date();

  switch (mapped) {
    case NotificationStatus.DELIVERED:
      if (currentStatus !== NotificationStatus.READ) {
        return {
          status: NotificationStatus.DELIVERED,
          deliveredAt: notification.deliveredAt ?? now,
        };
      }
      return {};
    case NotificationStatus.READ:
      return {
        status: NotificationStatus.READ,
        deliveredAt: notification.deliveredAt ?? now,
        readAt: notification.readAt ?? now,
      };
    case NotificationStatus.SENT:
      if (
        currentStatus === NotificationStatus.PENDING ||
        currentStatus === NotificationStatus.QUEUED ||
        currentStatus === NotificationStatus.SENDING
      ) {
        return {
          status: NotificationStatus.SENT,
          sentAt: notification.sentAt ?? now,
        };
      }
      return {};
    case NotificationStatus.QUEUED:
      if (
        currentStatus === NotificationStatus.PENDING ||
        currentStatus === NotificationStatus.SENDING
      ) {
        return { status: NotificationStatus.QUEUED };
      }
      return {};
    case NotificationStatus.FAILED:
      return {
        status: NotificationStatus.FAILED,
        failedAt: now,
        errorMessage: reason ?? "Delivery failed reported by provider",
      };
    default:
      return {};
  }
};

const processStatusEvent = async (event: StatusEvent): Promise<void> => {
  if ((!event.providerMessageId && !event.crqid) || !event.status) {
    logger.debug({ event }, "[whatsapp.webhook] Event missing messageId/crqid or status — skipping");
    return;
  }

  let notification = event.providerMessageId
    ? await prisma.notification.findFirst({
        where: { providerMessageId: event.providerMessageId },
      })
    : null;

  if (!notification && event.crqid) {
    notification = await prisma.notification.findFirst({
      where: { id: event.crqid },
    });
  }

  if (!notification) {
    logger.info(
      { providerMessageId: event.providerMessageId, crqid: event.crqid },
      "[whatsapp.webhook] Notification not found for providerMessageId/crqid"
    );
    return;
  }

  const updateData = buildUpdateForStatus(notification, event.status!, event.reason);

  if (Object.keys(updateData).length > 0) {
    if (event.providerMessageId && !notification.providerMessageId) {
      (updateData as any).providerMessageId = event.providerMessageId;
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: updateData,
    });

    logger.info(
      {
        notificationId: notification.id,
        providerMessageId: event.providerMessageId,
        newStatus: updateData.status,
      },
      "[whatsapp.webhook] Notification status updated via webhook"
    );
  }
};

export const whatsappWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!isAuthorizedWebhook(req)) {
      logger.warn({ ip: req.ip }, "[whatsapp.webhook] Unauthorized webhook callback rejected");
      res.status(403).json({ success: false, message: "Unauthorized" });
      return;
    }

    const body = req.body;
    logger.debug({ bodyKeys: body && typeof body === "object" ? Object.keys(body) : [] }, "[whatsapp.webhook] Webhook event received");

    const events = collectStatusEvents(body);
    if (events.length === 0) {
      logger.warn("[whatsapp.webhook] No status events found in payload");
      res.status(200).json({ received: true });
      return;
    }

    for (const event of events) {
      try {
        await processStatusEvent(event);
      } catch (err) {
        logger.error({ err, event }, "[whatsapp.webhook] Failed to process status event");
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, "[whatsapp.webhook] Error handling status callback");
    res.status(200).json({ received: true });
  }
};

const isAuthorizedWebhook = (req: Request): boolean => {
  const secret = env.WHATSAPP_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn("[whatsapp.webhook] WHATSAPP_WEBHOOK_SECRET not configured — accepting callback without verification");
    return true;
  }

  const provided =
    (req.headers["x-webhook-token"] as string) ||
    (req.headers["x-msg91-token"] as string) ||
    (req.headers["authkey"] as string) ||
    (req.query.token as string);

  if (!provided) return false;

  // Prefer exact match when lengths equal; otherwise compare digests for constant-time check.
  if (provided.length === secret.length) {
    try {
      return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
    } catch {
      return false;
    }
  }

  const hashA = crypto.createHash("sha256").update(String(provided)).digest();
  const hashB = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};
