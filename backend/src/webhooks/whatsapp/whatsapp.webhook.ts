import type { Request, Response } from "express";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

/**
 * Meta Webhook verification (GET) + event handler (POST).
 * Set Webhook URL in Meta Developer Console:
 *   <APP_URL>/api/v1/webhooks/whatsapp
 */
export const whatsappWebhookVerify = (req: Request, res: Response): void => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
};

export const whatsappWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body;
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages?.length) {
      for (const msg of messages) {
        logger.info({ msg }, "[whatsapp] Incoming message");

        await prisma.whatsappLog.create({
          data: {
            waMessageId: msg.id,
            from: msg.from,
            type: msg.type,
            body: msg.text?.body ?? JSON.stringify(msg),
            direction: "INBOUND",
          },
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, "[whatsapp] Webhook handler error");
    res.status(200).json({ received: true }); // Always 200 to Meta
  }
};
