import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/database";
import { logger } from "../../../config/logger";
import {
  parseMinScoreToAutoAssign,
  parseScoreTemperatureBands,
  resolveAiCallingConfig,
  scoreToTemperature,
} from "../../ai-calling/ai-calling.config";
import { isTerminalCallStatus } from "../../ai-calling/ai-calling.types";
import type { LeadTemperature } from "../../ai-calling/ai-calling.types";
import {
  computeMissingMappedFields,
  type LeadAgentVariableSource,
} from "../../ai-calling/agent-variables.util";
import {
  extractCallbackAtFromAgentVariables,
  normalizeLeadIntent,
  type LeadIntent,
} from "../../ai-calling/lead-intent.util";
import { LeadActivityService } from "./lead-activity.service";
import { LeadNotifyService } from "./lead-notify.service";
import { autoAssignLeadToBranchCounsellor } from "./lead-auto-assign.service";

const RETRYABLE_STATUSES = new Set(["NO_ANSWER", "BUSY", "FAILED"]);

/** Keys that map onto Lead columns (not aiCollectedFields). */
const LEAD_COLUMN_KEYS = new Set([
  "interestedIn",
  "course_interest",
  "courseInterest",
  "interested_in",
  "email",
  "notes",
  "remarks",
  "ai_remarks",
  "summary",
]);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asStringRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pickString(
  vars: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const v = vars[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function hasTruthyField(
  vars: Record<string, unknown>,
  keys: string[]
): boolean {
  for (const key of keys) {
    const v = vars[key];
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) return true;
    if (typeof v === "boolean" && v) return true;
    if (typeof v === "number" && Number.isFinite(v)) return true;
  }
  return false;
}

/** Primary: Sarvam `lead_score` (0–100) from extractedFields. */
function parseLeadScoreFromExtracted(
  extracted: Record<string, unknown>
): number | null {
  const candidates = [
    extracted.lead_score,
    extracted.leadScore,
    extracted.score,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return clampScore(c);
    if (typeof c === "string" && c.trim()) {
      const n = Number(c.trim());
      if (Number.isFinite(n)) return clampScore(n);
    }
  }
  return null;
}

function parseScoreReasonFromExtracted(
  extracted: Record<string, unknown>
): string | null {
  return pickString(extracted, [
    "score_reason",
    "scoreReason",
    "lead_score_reason",
    "scoring_reason",
  ]);
}

/**
 * Fallback score when Sarvam does not return lead_score.
 * Uses intent + extracted factor checklist + summary phrase soft signals —
 * not hard-coded absolute scores from intent alone.
 */
export function deriveScoreFromConversationSignals(params: {
  status: string;
  intent: LeadIntent | null;
  duration: number;
  aiSummary: string | null;
  extracted: Record<string, unknown>;
}): number {
  let score = 40;
  if (params.status === "CALLBACK_REQUESTED") {
    score = 55;
  } else if (params.status === "COMPLETED") {
    score = params.duration >= 60 ? 45 : 38;
  } else if (RETRYABLE_STATUSES.has(params.status)) {
    score = 22;
  }

  const intentBoost: Partial<Record<LeadIntent, number>> = {
    CONVERTED: 35,
    ADMISSION_INTERESTED: 28,
    HIGHLY_INTERESTED: 24,
    INTERESTED: 18,
    NEED_MORE_INFORMATION: 8,
    FOLLOW_UP_REQUIRED: 6,
    CALL_BACK_LATER: 12,
    NOT_INTERESTED: -28,
    ALREADY_JOINED_ANOTHER: -32,
    WRONG_NUMBER: -36,
    NOT_REACHABLE: -12,
  };
  if (params.intent && intentBoost[params.intent] != null) {
    score += intentBoost[params.intent]!;
  }

  const { extracted } = params;
  if (
    hasTruthyField(extracted, ["budget", "budget_range", "fee_budget", "fees"])
  ) {
    score += 6;
  }
  if (
    hasTruthyField(extracted, [
      "preferred_batch",
      "preferredBatch",
      "batch",
      "batch_preference",
    ])
  ) {
    score += 5;
  }
  if (
    hasTruthyField(extracted, [
      "preferred_branch",
      "preferredBranch",
      "branch",
      "branch_preference",
    ])
  ) {
    score += 5;
  }
  if (
    hasTruthyField(extracted, [
      "preferred_timing",
      "preferredTiming",
      "timing",
      "preferred_time",
    ])
  ) {
    score += 4;
  }
  if (
    hasTruthyField(extracted, [
      "expected_joining_date",
      "joining_date",
      "expectedJoiningDate",
      "join_date",
    ])
  ) {
    score += 8;
  }
  if (
    hasTruthyField(extracted, [
      "course",
      "course_interest",
      "interestedIn",
      "course_name",
      "courseName",
    ])
  ) {
    score += 4;
  }
  if (hasTruthyField(extracted, ["objections", "objection"])) {
    score -= 4;
  }
  if (
    hasTruthyField(extracted, [
      "parent_or_student",
      "caller_type",
      "speaking_with",
    ])
  ) {
    score += 2;
  }

  const summary = (params.aiSummary || "").toLowerCase();
  if (summary.includes("fee") || summary.includes("fees")) score += 4;
  if (summary.includes("admission") || summary.includes("enroll")) score += 6;
  if (summary.includes("visit") || summary.includes("campus")) score += 5;
  if (summary.includes("batch")) score += 3;
  if (summary.includes("budget") || summary.includes("afford")) score += 3;
  if (summary.includes("not interested") || summary.includes("no interest")) {
    score -= 15;
  }
  if (summary.includes("wrong number")) score -= 20;
  if (summary.includes("already joined")) score -= 18;

  return clampScore(score);
}

/**
 * Stage / follow-up / next action from call status + intent.
 * Independent of lead score (score may be HOT while intent is FOLLOW_UP_REQUIRED).
 * CONVERTED intent → INTERESTED stage only (never auto status=CONVERTED).
 */
function deriveOutcomeActions(params: {
  status: string;
  intent: LeadIntent | null;
  duration: number;
  leadScore: number;
}): {
  admissionProbability: number;
  nextBestAction: string;
  stage?: string;
  createFollowUp: boolean;
  followUpPriority: string;
  followUpHours: number;
} {
  const intent = params.intent;
  let admissionProbability = clampScore(Math.round(params.leadScore * 0.75));
  let nextBestAction = "Review call and schedule counsellor follow-up";
  let stage: string | undefined;
  let createFollowUp = false;
  let followUpPriority = "MEDIUM";
  let followUpHours = 24;

  if (params.status === "CALLBACK_REQUESTED" || intent === "CALL_BACK_LATER") {
    admissionProbability = Math.max(admissionProbability, 65);
    nextBestAction = "Call back as requested and schedule counselling";
    stage = "FOLLOW_UP";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 4;
  } else if (intent === "CONVERTED") {
    // Intent only — do not set Lead.status/stage to CONVERTED without admission API
    admissionProbability = Math.max(admissionProbability, 90);
    nextBestAction =
      "Confirm admission conversion via counsellor / admission flow";
    stage = "INTERESTED";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 4;
  } else if (intent === "ADMISSION_INTERESTED") {
    admissionProbability = Math.max(admissionProbability, 85);
    nextBestAction = "Start admission process and share fee structure";
    stage = "INTERESTED";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 4;
  } else if (intent === "HIGHLY_INTERESTED") {
    admissionProbability = Math.max(admissionProbability, 78);
    nextBestAction = "Schedule counselling and share fee details";
    stage = "INTERESTED";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 8;
  } else if (intent === "INTERESTED") {
    admissionProbability = Math.max(admissionProbability, 68);
    nextBestAction = "Schedule counselling and share course details";
    stage = "INTERESTED";
    createFollowUp = true;
    followUpPriority = "HIGH";
    followUpHours = 12;
  } else if (intent === "NEED_MORE_INFORMATION") {
    admissionProbability = Math.max(admissionProbability, 45);
    nextBestAction = "Send course info pack and follow up";
    stage = "FOLLOW_UP";
    createFollowUp = true;
    followUpPriority = "MEDIUM";
    followUpHours = 24;
  } else if (intent === "FOLLOW_UP_REQUIRED") {
    admissionProbability = Math.max(admissionProbability, 42);
    nextBestAction = "Complete follow-up as indicated by AI call";
    stage = "FOLLOW_UP";
    createFollowUp = true;
    followUpPriority = "MEDIUM";
    followUpHours = 24;
  } else if (intent === "NOT_INTERESTED") {
    admissionProbability = Math.min(admissionProbability, 8);
    nextBestAction = "Mark nurture or lost after counsellor review";
    stage = "CONTACTED";
  } else if (intent === "ALREADY_JOINED_ANOTHER") {
    admissionProbability = Math.min(admissionProbability, 5);
    nextBestAction = "Close as lost (joined another institute) after review";
    stage = "CONTACTED";
  } else if (intent === "WRONG_NUMBER") {
    admissionProbability = Math.min(admissionProbability, 2);
    nextBestAction = "Verify phone number with source and update lead";
    stage = "CONTACTED";
  } else if (intent === "NOT_REACHABLE") {
    admissionProbability = Math.min(admissionProbability, 15);
    nextBestAction = "Retry AI call or attempt manual contact";
  } else if (params.status === "COMPLETED") {
    nextBestAction = "Review AI summary and assign counsellor follow-up";
    stage = "CONTACTED";
    createFollowUp = params.duration >= 30;
    followUpHours = 48;
  } else if (RETRYABLE_STATUSES.has(params.status)) {
    nextBestAction = "Retry AI call or attempt manual contact";
  }

  return {
    admissionProbability: clampScore(admissionProbability),
    nextBestAction,
    stage,
    createFollowUp,
    followUpPriority,
    followUpHours,
  };
}

function mergeAiCollectedFields(
  existing: unknown,
  extracted: Record<string, unknown>
): Record<string, unknown> {
  const base = asStringRecord(existing);
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(extracted)) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (
      [
        "interestStatus",
        "interest_status",
        "lead_intent",
        "leadIntent",
        "intent",
        "summary",
        "aiSummary",
        "ai_summary",
      ].includes(key)
    ) {
      continue;
    }
    if (
      LEAD_COLUMN_KEYS.has(key) &&
      ["interestedIn", "email", "notes"].includes(key)
    ) {
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

async function resolvePreferredBranchId(
  instituteId: string,
  preferredBranchRaw: string | null
): Promise<{ id: string; name: string } | null> {
  if (!preferredBranchRaw) return null;
  const name = preferredBranchRaw.trim();
  if (!name) return null;

  const exact = await prisma.branch.findFirst({
    where: {
      instituteId,
      status: "ACTIVE",
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { code: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  if (exact) return exact;

  const contains = await prisma.branch.findFirst({
    where: {
      instituteId,
      status: "ACTIVE",
      name: { contains: name, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });
  return contains;
}

/**
 * Post-call automation: extract merge, score, temperature, stage, follow-up,
 * preferred-branch re-assign, activities, retry.
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
            name: true,
            phoneNumber: true,
            email: true,
            interestedIn: true,
            notes: true,
            source: true,
            stage: true,
            priority: true,
            tags: true,
            instituteId: true,
            branchId: true,
            status: true,
            assignedCounsellorId: true,
            createdById: true,
            importJobId: true,
            leadScore: true,
            aiCollectedFields: true,
            course: { select: { name: true } },
            branch: { select: { name: true } },
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

    const extracted = asStringRecord(callLog.extractedFields);
    const intent =
      normalizeLeadIntent(callLog.interestStatus) ||
      normalizeLeadIntent(
        pickString(extracted, [
          "lead_intent",
          "leadIntent",
          "interestStatus",
          "interest_status",
          "intent",
        ])
      );

    const aiScore = parseLeadScoreFromExtracted(extracted);
    const scoreReason =
      parseScoreReasonFromExtracted(extracted) ||
      (aiScore == null
        ? "Derived from conversation signals (intent, extraction, summary)"
        : null);

    const leadScore =
      aiScore ??
      deriveScoreFromConversationSignals({
        status: callLog.status,
        intent,
        duration: callLog.duration,
        aiSummary: callLog.aiSummary,
        extracted,
      });

    const derived = deriveOutcomeActions({
      status: callLog.status,
      intent,
      duration: callLog.duration,
      leadScore,
    });

    const interestedInFromAi = pickString(extracted, [
      "interestedIn",
      "course_interest",
      "courseInterest",
      "interested_in",
      "course_name",
      "courseName",
      "course",
    ]);
    const emailFromAi = pickString(extracted, ["email", "email_address"]);
    const remarksFromAi = pickString(extracted, [
      "remarks",
      "ai_remarks",
      "notes",
      "counsellor_notes",
    ]);
    const preferredBranchRaw = pickString(extracted, [
      "preferred_branch",
      "preferredBranch",
      "branch_preference",
      "branch",
    ]);

    const aiCollectedFields = mergeAiCollectedFields(
      lead.aiCollectedFields,
      extracted
    );
    if (aiScore != null) {
      aiCollectedFields.lead_score = aiScore;
    }
    if (scoreReason) {
      aiCollectedFields.score_reason = scoreReason;
    }
    if (intent) {
      aiCollectedFields.intent = intent;
    }

    const callbackAt = extractCallbackAtFromAgentVariables(extracted);
    if (callbackAt && callbackAt.getTime() > Date.now()) {
      const hours = Math.max(
        1,
        Math.round((callbackAt.getTime() - Date.now()) / (60 * 60 * 1000))
      );
      derived.createFollowUp = true;
      derived.followUpHours = Math.min(hours, 24 * 14);
      derived.followUpPriority = "HIGH";
      if (
        !derived.stage ||
        ["NEW", "ASSIGNED", "CONTACTED"].includes(derived.stage)
      ) {
        derived.stage = "FOLLOW_UP";
      }
    }

    const config = await resolveAiCallingConfig(lead.instituteId);
    const bands = parseScoreTemperatureBands(config.scoreTemperatureBands);
    const leadTemperature: LeadTemperature = scoreToTemperature(
      leadScore,
      bands
    );

    const matchedBranch = await resolvePreferredBranchId(
      lead.instituteId,
      preferredBranchRaw
    );
    const previousBranchId = lead.branchId;
    const nextBranchId = matchedBranch?.id ?? previousBranchId;
    const branchChanged = nextBranchId !== previousBranchId;

    const leadForMissing: LeadAgentVariableSource = {
      name: lead.name,
      phoneNumber: lead.phoneNumber,
      email: emailFromAi || lead.email,
      interestedIn: interestedInFromAi || lead.interestedIn,
      source: lead.source,
      notes: lead.notes,
      stage: derived.stage || lead.stage,
      priority: lead.priority,
      tags: lead.tags,
      course: lead.course,
      branch: matchedBranch
        ? { name: matchedBranch.name }
        : lead.branch,
    };
    const missingAfterMerge = computeMissingMappedFields(
      leadForMissing,
      config.agentVariableMap
    );

    let createdFollowUp: {
      id: string;
      scheduledAt: Date;
      priority: string;
    } | null = null;

    const followUpCreated = await prisma.$transaction(async (tx) => {
      const leadUpdate: Prisma.LeadUncheckedUpdateInput = {
        leadScore,
        leadTemperature,
        admissionProbability: derived.admissionProbability,
        nextBestAction: derived.nextBestAction,
        lastContactedAt: new Date(),
        leadIntent: intent,
        aiCollectedFields: aiCollectedFields as Prisma.InputJsonValue,
      };

      if (branchChanged) {
        leadUpdate.branchId = nextBranchId;
      }

      if (interestedInFromAi && interestedInFromAi !== lead.interestedIn) {
        leadUpdate.interestedIn = interestedInFromAi;
      }
      if (emailFromAi && !lead.email) {
        leadUpdate.email = emailFromAi;
      }
      if (remarksFromAi) {
        const existingNotes = lead.notes?.trim() || "";
        const aiBlock = `[AI Call] ${remarksFromAi}`;
        if (!existingNotes.includes(aiBlock)) {
          leadUpdate.notes = existingNotes
            ? `${existingNotes}\n\n${aiBlock}`
            : aiBlock;
        }
      }

      await tx.lead.update({
        where: { id: lead.id },
        data: leadUpdate,
      });

      const nextActionSignal = derived.createFollowUp
        ? `Follow-up created — ${callLog.nextAction || derived.nextBestAction}`
        : callLog.nextAction || derived.nextBestAction;

      await tx.callLog.update({
        where: { id: callLog.id },
        data: {
          nextAction: nextActionSignal,
          qualification:
            callLog.qualification || intent || callLog.interestStatus || null,
          interestStatus: intent || callLog.interestStatus,
          outcome: intent || callLog.outcome,
          scoreReason: scoreReason,
          extractedFields: {
            ...extracted,
            lead_score: leadScore,
            score_reason: scoreReason,
            lead_temperature: leadTemperature,
            _missingFieldsAfterMerge: missingAfterMerge,
            ...(branchChanged
              ? {
                  _preferredBranchResolved: {
                    from: previousBranchId,
                    to: nextBranchId,
                    raw: preferredBranchRaw,
                  },
                }
              : {}),
          } as Prisma.InputJsonValue,
        },
      });

      await LeadActivityService.logActivity(
        lead.id,
        "SCORE_UPDATED",
        `Lead score set to ${leadScore} (${leadTemperature})`,
        {
          description: scoreReason
            ? `${scoreReason}. Admission probability ${derived.admissionProbability}. Next: ${derived.nextBestAction}`
            : `Admission probability ${derived.admissionProbability}. Next: ${derived.nextBestAction}`,
          metadata: {
            callLogId,
            leadScore,
            leadTemperature,
            scoreReason,
            scoreSource: aiScore != null ? "ai" : "fallback",
            admissionProbability: derived.admissionProbability,
            status: callLog.status,
            interestStatus: intent || callLog.interestStatus,
            leadIntent: intent,
            missingFields: missingAfterMerge,
            branchChanged,
            previousBranchId,
            nextBranchId,
          },
          tx,
        }
      );

      if (
        Object.keys(extracted).length > 0 ||
        interestedInFromAi ||
        remarksFromAi ||
        branchChanged
      ) {
        await LeadActivityService.logActivity(
          lead.id,
          "NOTE_ADDED",
          branchChanged
            ? "AI call extraction merged; preferred branch updated"
            : "AI call extraction merged into lead",
          {
            description:
              remarksFromAi ||
              callLog.aiSummary ||
              `Intent: ${intent || "unknown"}`,
            metadata: {
              callLogId,
              leadIntent: intent,
              extractedKeys: Object.keys(extracted),
              branchChanged,
              previousBranchId,
              nextBranchId,
              preferredBranchRaw,
            },
            tx,
          }
        );
      }

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
              notes: `Auto-updated from AI call (${callLog.status}${intent ? `, ${intent}` : ""})`,
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
                leadIntent: intent,
              },
              tx,
            }
          );
        }
      }

      if (!derived.createFollowUp) {
        return null;
      }

      const scheduledAt =
        callbackAt && callbackAt.getTime() > Date.now()
          ? callbackAt
          : new Date(Date.now() + derived.followUpHours * 60 * 60 * 1000);
      const counsellorId = lead.assignedCounsellorId ?? lead.createdById;

      const followUp = await tx.leadFollowUp.create({
        data: {
          leadId: lead.id,
          counsellorId,
          createdById: lead.createdById,
          type: "CALL",
          status: "PENDING",
          priority: derived.followUpPriority,
          recommendedRank:
            leadScore >= bands.hotMin ? 1 : leadScore >= bands.coolMin ? 2 : 3,
          scheduledAt,
          notes: `Auto-created from AI call (${callLog.status}${intent ? `, ${intent}` : ""}). ${derived.nextBestAction}`,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          nextFollowUpAt: scheduledAt,
          stage: ["NEW", "ASSIGNED", "CONTACTED"].includes(
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
          metadata: { followUpId: followUp.id, callLogId, leadIntent: intent },
          tx,
        }
      );

      return {
        id: followUp.id,
        scheduledAt: followUp.scheduledAt,
        priority: followUp.priority,
      };
    });

    createdFollowUp = followUpCreated;

    // Auto-assign when score meets threshold and lead is unassigned, or branch changed.
    // Below threshold: leave assignee as-is (do not yank counsellor for a cold lead).
    const minScoreToAutoAssign = parseMinScoreToAutoAssign(
      config.minScoreToAutoAssign
    );
    const needsAssign =
      leadScore >= minScoreToAutoAssign &&
      (!lead.assignedCounsellorId || branchChanged);

    if (needsAssign) {
      try {
        await autoAssignLeadToBranchCounsellor({
          leadId: lead.id,
          instituteId: lead.instituteId,
          branchId: nextBranchId,
          assignedById: lead.createdById,
          notes: branchChanged
            ? "Re-assigned after AI call preferred branch change (score threshold met)"
            : "Auto-assigned after AI call met min score to auto-assign",
          metadata: {
            reason: branchChanged
              ? "ai_score_threshold_branch_change"
              : "ai_score_threshold",
            leadScore,
            minScoreToAutoAssign,
            previousBranchId,
            nextBranchId,
            callLogId,
          },
        });
      } catch (err) {
        logger.warn(
          { err, leadId: lead.id, nextBranchId, callLogId, leadScore },
          "[LeadAiOutcome] Score-threshold auto-assign failed"
        );
      }
    }

    if (createdFollowUp) {
      const refreshed = await prisma.lead.findUnique({
        where: { id: lead.id },
        select: { assignedCounsellorId: true, branchId: true },
      });
      await LeadNotifyService.notifyFollowUpCreated({
        instituteId: lead.instituteId,
        branchId: refreshed?.branchId ?? nextBranchId,
        leadId: lead.id,
        leadName: lead.name,
        assignedCounsellorId:
          refreshed?.assignedCounsellorId ?? lead.assignedCounsellorId,
        followUpId: createdFollowUp.id,
        scheduledAt: createdFollowUp.scheduledAt,
        priority: createdFollowUp.priority,
      });
    }

    if (RETRYABLE_STATUSES.has(callLog.status)) {
      await this.maybeEnqueueRetry(lead.id, callLog.attemptNumber);
    }

    logger.info(
      {
        callLogId,
        leadId: lead.id,
        status: callLog.status,
        leadScore,
        leadTemperature,
        scoreSource: aiScore != null ? "ai" : "fallback",
        leadIntent: intent,
        branchChanged,
        missingFields: missingAfterMerge,
      },
      "[LeadAiOutcome] Processed terminal AI call outcome"
    );
  },

  async maybeEnqueueRetry(
    leadId: string,
    lastAttemptNumber: number
  ): Promise<void> {
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
      const { buildIdempotencyKey } = await import(
        "../../ai-calling/ai-calling.types"
      );
      const { aiCallingQueue } = await import(
        "../../../queues/ai-calling.queue"
      );
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
