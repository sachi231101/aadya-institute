import type { Request, Response } from "express";
import { logger } from "../../config/logger";
import { LeadService } from "../../modules/leads/lead.service";
import type { SarvamWebhookPayload } from "../../integrations/sarvam/sarvam.types";

/**
 * Sarvam AI Webhook Handler
 *
 * Sarvam calls this endpoint after every outbound call attempt completes.
 * Payload contains: attempt_id, status, transcript, duration, interaction_id
 *
 * This handler:
 *  1. Finds the Lead by attempt_id
 *  2. Saves transcript + call status to DB
 *  3. Triggers LLM scoring (Good / Average / Weak)
 *  4. Updates lead status (QUALIFIED / FOLLOW_UP / WEAK)
 */
export const sarvamWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Always respond 200 immediately so Sarvam doesn't retry
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

    await LeadService.handleSarvamWebhook(payload);
  } catch (err) {
    logger.error({ err }, "[Sarvam Webhook] Handler error");
  }
};
