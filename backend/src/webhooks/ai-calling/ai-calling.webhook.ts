import type { Request, Response } from "express";
import { logger } from "../../config/logger";
import { AppError } from "../../middlewares/error.middleware";
import { AiCallingService } from "../../modules/ai-calling/ai-calling.service";
import type { SarvamWebhookPayload } from "../../modules/ai-calling/ai-calling.types";

function extractWebhookSecret(req: Request): string | undefined {
  const header =
    req.header("x-webhook-secret") ||
    req.header("x-sarvam-webhook-secret") ||
    req.header("x-ai-calling-secret");
  if (header) return header.trim();

  const auth = req.header("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return undefined;
}

/**
 * Sarvam AI Webhook Handler
 * Verifies secret (required in production), then updates CallLog by externalCallId.
 */
export const sarvamWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await AiCallingService.assertWebhookAuthorized(extractWebhookSecret(req));
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 401;
    const message = err instanceof Error ? err.message : "Unauthorized";
    logger.warn({ message }, "[Sarvam Webhook] Rejected");
    res.status(status).json({ success: false, message });
    return;
  }

  // Ack quickly after auth
  res.status(200).json({ received: true });

  try {
    const payload = req.body as SarvamWebhookPayload;

    logger.info(
      { attempt_id: payload.attempt_id, status: payload.status },
      "[Sarvam Webhook] Received call result"
    );

    if (!payload.attempt_id) {
      logger.warn("[Sarvam Webhook] No attempt_id in payload — skipping");
      return;
    }

    await AiCallingService.handleSarvamWebhook(payload);
  } catch (err) {
    logger.error({ err }, "[Sarvam Webhook] Handler error");
  }
};
