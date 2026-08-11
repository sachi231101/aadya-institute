import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import type { SarvamWebhookPayload } from "../../integrations/sarvam/sarvam.types";

export const LeadService = {
  /**
   * Handles an incoming Sarvam AI webhook payload after a call attempt completes.
   *
   * Persists the call result into the CallLog table so it can be reviewed.
   * A Lead model does not yet exist in the schema; this uses CallLog as the
   * storage target for Sarvam call outcomes.
   *
   * Steps:
   *  1. Check if a CallLog already exists for this attempt_id (idempotency)
   *  2. Upsert the CallLog record with the call status, transcript and duration
   *  3. Log the outcome for observability
   */
  async handleSarvamWebhook(payload: SarvamWebhookPayload): Promise<void> {
    const {
      attempt_id,
      status,
      interaction_transcript,
      duration,
    } = payload;

    const transcriptText = interaction_transcript
      ? interaction_transcript.map((t) => `${t.role}: ${t.text}`).join("\n")
      : null;

    // Upsert CallLog — idempotent, safe if Sarvam retries the webhook
    await prisma.callLog.upsert({
      where: { externalCallId: attempt_id },
      update: {
        status,
        duration: duration ?? 0,
        transcript: transcriptText,
      },
      create: {
        externalCallId: attempt_id,
        status,
        duration: duration ?? 0,
        transcript: transcriptText,
      },
    });

    logger.info(
      { attempt_id, status, duration },
      "[LeadService] CallLog upserted after Sarvam webhook"
    );
  },
};
