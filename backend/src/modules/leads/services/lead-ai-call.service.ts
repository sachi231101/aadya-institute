/**
 * Thin wrapper around AiCallingService so createLead / import share one dial path.
 * Keep TERMINAL_AI_CALL_STATUSES exports for assignment gates.
 */
export {
  TERMINAL_AI_CALL_STATUSES,
  isTerminalCallStatus,
} from "../../ai-calling/ai-calling.types";

import { prisma } from "../../../config/database";
import { TERMINAL_AI_CALL_STATUSES } from "../../ai-calling/ai-calling.types";

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
  instituteId: string;
  branchId?: string | null;
  importJobId?: string | null;
}): Promise<void> {
  const { AiCallingService } = await import(
    "../../ai-calling/ai-calling.service"
  );
  await AiCallingService.enqueueInitialLeadCall(lead);
}

export async function applyTerminalCallStatus(
  leadId: string,
  status: string
): Promise<void> {
  const { AiCallingService } = await import(
    "../../ai-calling/ai-calling.service"
  );
  await AiCallingService.applyTerminalCallStatus(leadId, status);
}

/** @deprecated Use AiCallingService.processCallJob via queue payload { callLogId, leadId, instituteId } */
export async function processQueuedLeadCall(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const inFlight = await prisma.callLog.findFirst({
    where: {
      leadId,
      instituteId: lead.instituteId,
      status: { in: ["INITIATED", "RINGING", "ANSWERED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!inFlight) return;

  const { AiCallingService } = await import(
    "../../ai-calling/ai-calling.service"
  );
  await AiCallingService.processCallJob({
    callLogId: inFlight.id,
    leadId: lead.id,
    instituteId: lead.instituteId,
  });
}

export function isTelephonyConfigured(): boolean {
  return Boolean(process.env.TELEPHONY_BASE_URL && process.env.TELEPHONY_API_KEY);
}
