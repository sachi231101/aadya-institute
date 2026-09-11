/**
 * MSG91 delivery status → internal NotificationStatus mapping.
 *
 * @module modules/whatsapp/integrations/msg91.status
 */
import { NotificationStatus } from "../whatsapp.constants";

export const normalizeMsg91Status = (raw: string | undefined | null): string =>
  String(raw || "")
    .trim()
    .toLowerCase();

/**
 * Map MSG91 webhook/API status strings to internal notification lifecycle.
 */
export const mapMsg91StatusToNotification = (
  rawStatus: string | undefined | null
): NotificationStatus | null => {
  const s = normalizeMsg91Status(rawStatus);
  switch (s) {
    case "submitted":
    case "queued":
    case "accepted":
    case "pending":
      return NotificationStatus.QUEUED;
    case "sent":
      return NotificationStatus.SENT;
    case "delivered":
      return NotificationStatus.DELIVERED;
    case "read":
    case "seen":
      return NotificationStatus.READ;
    case "failed":
    case "rejected":
    case "error":
    case "undelivered":
      return NotificationStatus.FAILED;
    default:
      return null;
  }
};
