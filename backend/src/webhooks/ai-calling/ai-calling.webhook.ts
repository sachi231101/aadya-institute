import type { Request, Response } from "express";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

export const aiCallingCallbackHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { callId, studentId, status, duration, transcript } = req.body;

    logger.info({ callId, status }, "[ai-calling] Callback received");

    if (studentId) {
      await prisma.callLog.create({
        data: {
          externalCallId: callId,
          studentId,
          status,
          duration: Number(duration) || 0,
          transcript: transcript ?? null,
        },
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, "[ai-calling] Callback handler error");
    res.status(200).json({ received: true });
  }
};
