import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import { resolveAiCallingConfig } from "../../ai-calling/ai-calling.config";
import { isTerminalCallStatus } from "../../ai-calling/ai-calling.types";
import { LeadActivityService } from "./lead-activity.service";

const RETRYABLE_STATUSES = new Set(["NO_ANSWER", "BUSY", "FAILED"]);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveScoreFromCall(params: {
  status: string;
  interestStatus: string | null;
  duration: number;
  aiSummary: string | null;
}): {
  leadScore: number;
  admissionProbability: number;
  nextBestAction: string;
  stage?: string;
  createFollowUp: boolean;
  followUpPriority: string;
  followUpHours: number;
} {
  const interest = (params.interestStatus || "").toUpperCase();
  const summary = (params.aiSummary || "").toLowerCase();

  let leadScore = 35;
  let admissionProbability = 20;
  let nextBestAction = "Review call and schedule counsellor follow-up";
  let stage: string | undefined;
  let createFollowUp = false;
  let followUpPriority = "MEDIUM";
  let followUpHours = 24;

  if (params.status === "CALLBACK_REQUESTED") {
    leadScore = 78;
    admissionProbability = 65;
    nextBestAction = "Call back as requested and schedule counselling";
    stage = "FOLLOW_UP";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 4;
  } else if (
    interest.includes("HIGH") ||
    interest.includes("INTERESTED") ||
    interest === "HOT"
  ) {
    leadScore = 85;
    admissionProbability = 72;
    nextBestAction = "Schedule counselling and share fee details";
    stage = "INTERESTED";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 12;
  } else if (interest.includes("WARM") || interest.includes("MAYBE")) {
    leadScore = 55;
    admissionProbability = 42;
    nextBestAction = "Nurture with course info and follow up in 1–2 days";
    stage = "FOLLOW_UP";
    createFollowUp = true;
    followUpPriority = "MEDIUM";
    followUpHours = 36;
  } else if (
    interest.includes("NOT") ||
    interest.includes("LOW") ||
    interest === "COLD"
  ) {
    leadScore = 18;
    admissionProbability = 10;
    nextBestAction = "Mark nurture or lost after counsellor review";
    stage = "CONTACTED";
  } else if (params.status === "COMPLETED") {
    leadScore = params.duration >= 60 ? 48 : 38;
    admissionProbability = params.duration >= 60 ? 35 : 25;
    nextBestAction = "Review AI summary and assign counsellor follow-up";
    stage = "CONTACTED";
    createFollowUp = params.duration >= 30;
    followUpHours = 48;
  } else if (RETRYABLE_STATUSES.has(params.status)) {
    leadScore = 25;
    admissionProbability = 15;
    nextBestAction = "Retry AI call or attempt manual contact";
  }

  if (summary.includes("fee") || summary.includes("admission")) {
    leadScore = clampScore(leadScore + 5);
    admissionProbability = clampScore(admissionProbability + 5);
  }
  if (summary.includes("not interested") || summary.includes("no interest")) {
    leadScore = clampScore(leadScore - 15);
    admissionProbability = clampScore(admissionProbability - 10);
  }

  return {
    leadScore: clampScore(leadScore),
    admissionProbability: clampScore(admissionProbability),
    nextBestAction,
    stage,
    createFollowUp,
    followUpPriority,
    followUpHours,
  };
}

/**
 * Post-call automation: score, stage, follow-up, activities, and retry enqueue.
 * Called after a terminal CallLog update from the Sarvam webhook.
 */
export const LeadAiOutcomeService = {
  async process(callLogId: string): Promise<void> {
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        lead: {
          select: {
            id: true,
            instituteId: true,
            branchId: true,
            stage: true,
            status: true,
            assignedCounsellorId: true,
            createdById: true,
            phoneNumber: true,
            importJobId: true,
            leadScore: true,
          },
        },
      },
    });

    if (!callLog?.leadId || !callLog.lead) {
      return;
    }

    if (!isTerminalCallStatus(callLog.status)) {
      return;
    }

    const lead = callLog.lead;
    if (lead.status !== "ACTIVE") {
      return;
    }

    const derived = deriveScoreFromCall({
      status: callLog.status,
      interestStatus: callLog.interestStatus,
      duration: callLog.duration,
      aiSummary: callLog.aiSummary,
    });

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          leadScore: derived.leadScore,
          admissionProbability: derived.admissionProbability,
          nextBestAction: derived.nextBestAction,
          lastContactedAt: new Date(),
          ...(callLog.nextAction
            ? {}
            : {}),
        },
      });

      await tx.callLog.update({
        where: { id: callLog.id },
        data: {
          nextAction: callLog.nextAction || derived.nextBestAction,
          qualification:
            callLog.qualification ||
            callLog.interestStatus ||
            null,
        },
      });

      await LeadActivityService.logActivity(
        lead.id,
        "SCORE_UPDATED",
        `Lead score set to ${derived.leadScore}`,
        {
          description: `Admission probability ${derived.admissionProbability}. Next: ${derived.nextBestAction}`,
          metadata: {
            callLogId,
            leadScore: derived.leadScore,
            admissionProbability: derived.admissionProbability,
            status: callLog.status,
            interestStatus: callLog.interestStatus,
          },
          tx,
        }
      );

      if (
        derived.stage &&
        !["CONVERTED", "LOST"].includes(lead.stage) &&
        lead.stage !== derived.stage
      ) {
        const skipStage =
          lead.stage === "INTERESTED" && derived.stage === "CONTACTED";
        if (!skipStage) {
          await tx.lead.update({
            where: { id: lead.id },
            data: { stage: derived.stage },
          });
          await tx.leadStageHistory.create({
            data: {
              leadId: lead.id,
              fromStage: lead.stage,
              toStage: derived.stage,
              changedById: lead.createdById,
              notes: `Auto-updated from AI call (${callLog.status})`,
            },
          });
          await LeadActivityService.logActivity(
            lead.id,
            "STAGE_CHANGED",
            `Stage changed to ${derived.stage}`,
            {
              description: `AI outcome from call ${callLogId}`,
              metadata: {
                fromStage: lead.stage,
                toStage: derived.stage,
                callLogId,
              },
              tx,
            }
          );
        }
      }

      if (derived.createFollowUp) {
        const scheduledAt = new Date(
          Date.now() + derived.followUpHours * 60 * 60 * 1000
        );
        const counsellorId =
          lead.assignedCounsellorId ?? lead.createdById;

        const followUp = await tx.leadFollowUp.create({
          data: {
            leadId: lead.id,
            counsellorId,
            createdById: lead.createdById,
            type: "CALL",
            status: "PENDING",
            priority: derived.followUpPriority,
            recommendedRank: derived.leadScore >= 70 ? 1 : derived.leadScore >= 40 ? 2 : 3,
            scheduledAt,
            notes: `Auto-created from AI call (${callLog.status}). ${derived.nextBestAction}`,
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            nextFollowUpAt: scheduledAt,
            stage:
              ["NEW", "ASSIGNED", "CONTACTED"].includes(
                derived.stage || lead.stage
              )
                ? "FOLLOW_UP"
                : derived.stage || lead.stage,
          },
        });

        await LeadActivityService.logActivity(
          lead.id,
          "FOLLOW_UP_CREATED",
          `Follow-up scheduled for ${scheduledAt.toISOString()}`,
          {
            description: followUp.notes ?? undefined,
            metadata: { followUpId: followUp.id, callLogId },
            tx,
          }
        );
      }
    });

    // Honor retry for NO_ANSWER / BUSY / FAILED when under maxAttempts
    if (RETRYABLE_STATUSES.has(callLog.status)) {
      await this.maybeEnqueueRetry(lead.id, callLog.attemptNumber);
    }

    logger.info(
      {
        callLogId,
        leadId: lead.id,
        status: callLog.status,
        leadScore: derived.leadScore,
      },
      "[LeadAiOutcome] Processed terminal AI call outcome"
    );
  },

  async maybeEnqueueRetry(leadId: string, lastAttemptNumber: number): Promise<void> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        phoneNumber: true,
        createdById: true,
        instituteId: true,
        branchId: true,
        importJobId: true,
        status: true,
      },
    });
    if (!lead || lead.status !== "ACTIVE") return;

    const config = await resolveAiCallingConfig(lead.instituteId);
    const nextAttempt = lastAttemptNumber + 1;
    if (nextAttempt > config.maxAttemptsPerLead) {
      logger.info(
        { leadId, nextAttempt, max: config.maxAttemptsPerLead },
        "[LeadAiOutcome] Max attempts reached — skip retry"
      );
      return;
    }

    if (!config.hasTelephony || !config.isEnabled) {
      return;
    }

    try {
      const { AiCallingRepository } = await import(
        "../../ai-calling/ai-calling.repository"
      );
      const { buildIdempotencyKey } = await import("../../ai-calling/ai-calling.types");
      const { aiCallingQueue } = await import("../../../queues/ai-calling.queue");
      const { defaultJobOptions, QUEUE_PRIORITY } = await import(
        "../../../queues/queue"
      );

      const idempotencyKey = buildIdempotencyKey(
        lead.instituteId,
        lead.id,
        nextAttempt
      );
      const existing = await AiCallingRepository.findCallLogByIdempotencyKey(
        idempotencyKey
      );
      if (existing) {
        return;
      }

      const callLog = await AiCallingRepository.createCallLog({
        instituteId: lead.instituteId,
        branchId: lead.branchId ?? null,
        importJobId: lead.importJobId ?? null,
        agentId: config.agentId,
        leadId: lead.id,
        fromNumber: config.fromNumber || null,
        externalCallId: `retry_${lead.id}_${nextAttempt}_${Date.now()}`,
        status: "INITIATED",
        callType: "AI",
        duration: 0,
        attemptNumber: nextAttempt,
        idempotencyKey,
        startedAt: new Date(),
      });

      const delayMs = Math.max(config.retryDelayMinutes, 1) * 60 * 1000;
      await aiCallingQueue.add(
        "lead-ai-call-retry",
        {
          callLogId: callLog.id,
          leadId: lead.id,
          instituteId: lead.instituteId,
        },
        {
          ...defaultJobOptions(QUEUE_PRIORITY.USER_FACING),
          delay: delayMs,
          jobId: `retry-${callLog.id}`,
        }
      );

      logger.info(
        { leadId, callLogId: callLog.id, delayMs, nextAttempt },
        "[LeadAiOutcome] Scheduled delayed AI call retry"
      );
    } catch (err) {
      logger.error({ err, leadId }, "[LeadAiOutcome] Failed to enqueue retry");
    }
  },
};

