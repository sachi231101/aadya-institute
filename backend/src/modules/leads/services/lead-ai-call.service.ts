import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { LeadRepository } from "../lead.repository";
import { LeadActivityService } from "./lead-activity.service";

export const TERMINAL_AI_CALL_STATUSES = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CALLBACK_REQUESTED",
] as const;

export function isTelephonyConfigured(): boolean {
  return Boolean(process.env.TELEPHONY_BASE_URL && process.env.TELEPHONY_API_KEY);
}

export function isTerminalCallStatus(status: string): boolean {
  return TERMINAL_AI_CALL_STATUSES.includes(
    status.toUpperCase() as (typeof TERMINAL_AI_CALL_STATUSES)[number]
  );
}

export async function hasTerminalAiCall(leadId: string): Promise<boolean> {
  const log = await prisma.callLog.findFirst({
    where: {
      leadId,
      status: { in: [...TERMINAL_AI_CALL_STATUSES] },
    },
  });
  return Boolean(log);
}

export async function startInitialAiCall(lead: {
  id: string;
  phoneNumber: string;
  createdById: string;
}): Promise<void> {
  if (!isTelephonyConfigured()) {
    await completeLocalAiCall(lead);
    return;
  }

  await prisma.callLog.create({
    data: {
      leadId: lead.id,
      externalCallId: `queued_${lead.id}_${Date.now()}`,
      status: "INITIATED",
      duration: 0,
    },
  });

  try {
    const { aiCallingQueue } = await import("../../../queues/ai-calling.queue");
    const { defaultJobOptions, QUEUE_PRIORITY } = await import("../../../queues/queue");
    const callbackBase =
      process.env.PUBLIC_API_BASE_URL ||
      `http://localhost:${process.env.PORT || 5000}`;

    await aiCallingQueue.add(
      "lead-ai-call",
      {
        leadId: lead.id,
        to: lead.phoneNumber,
        from: process.env.TELEPHONY_FROM_NUMBER || "",
        callbackUrl: `${callbackBase}/api/v1/webhooks/sarvam/callback`,
      },
      defaultJobOptions(QUEUE_PRIORITY.USER_FACING)
    );
  } catch (err) {
    logger.error({ err, leadId: lead.id }, "[LeadAiCall] Failed to enqueue; completing locally");
    await completeLocalAiCall(lead);
  }
}

async function completeLocalAiCall(lead: {
  id: string;
  createdById: string;
}): Promise<void> {
  await prisma.callLog.create({
    data: {
      leadId: lead.id,
      externalCallId: `local_${lead.id}_${Date.now()}`,
      status: "FAILED",
      duration: 0,
      transcript:
        "AI call queued locally. Configure TELEPHONY_BASE_URL + TELEPHONY_API_KEY to place live calls.",
    },
  });

  await LeadRepository.changeStage(
    lead.id,
    "CONTACTED",
    lead.createdById,
    "AI call attempted (telephony not configured)"
  );

  await LeadActivityService.logActivity(
    lead.id,
    "CALL_COMPLETED",
    "AI call attempted locally",
    {
      userId: lead.createdById,
      description:
        "No telephony provider configured. Lead is ready to assign after this local attempt.",
      metadata: { status: "FAILED", local: true },
    }
  );
}

export async function processQueuedLeadCall(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const callbackBase =
    process.env.PUBLIC_API_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`;

  try {
    const { initiateCall } = await import(
      "../../../integrations/telephony/telephony.client"
    );
    const response = await initiateCall({
      to: lead.phoneNumber,
      from: process.env.TELEPHONY_FROM_NUMBER || "",
      callbackUrl: `${callbackBase}/api/v1/webhooks/sarvam/callback`,
      metadata: { leadId: lead.id, instituteId: lead.instituteId },
    });

    const existing = await prisma.callLog.findFirst({
      where: { leadId, status: "INITIATED" },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.callLog.update({
        where: { id: existing.id },
        data: {
          externalCallId: response.callId || existing.externalCallId,
          status: response.status || "INITIATED",
        },
      });
    }
  } catch (err) {
    logger.error({ err, leadId }, "[LeadAiCall] Telephony initiate failed");
    await prisma.callLog.create({
      data: {
        leadId,
        externalCallId: `failed_${leadId}_${Date.now()}`,
        status: "FAILED",
        duration: 0,
      },
    });
    await applyTerminalCallStatus(leadId, "FAILED");
  }
}

export async function applyTerminalCallStatus(
  leadId: string,
  status: string
): Promise<void> {
  if (!isTerminalCallStatus(status)) return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  if (lead.stage === "NEW") {
    await LeadRepository.changeStage(
      leadId,
      "CONTACTED",
      lead.createdById,
      `AI call finished with status ${status}`
    );
  }
}
