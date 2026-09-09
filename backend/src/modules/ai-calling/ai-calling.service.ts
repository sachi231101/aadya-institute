import { UnrecoverableError } from "bullmq";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { AppError } from "../../middlewares/error.middleware";
import {
  decryptCredentials,
  encryptCredentials,
  fingerprintSecret,
} from "../../utils/integration-credentials.util";
import { initiateCall } from "../../integrations/telephony/telephony.client";
import type { AuthUser } from "../auth/auth.types";
import { LeadRepository } from "../leads/lead.repository";
import { LeadActivityService } from "../leads/services/lead-activity.service";
import {
  resolveAiCallingConfig,
  toSafeInstituteConfigDto,
  toSafePlatformDto,
} from "./ai-calling.config";
import {
  isWithinCallingHours,
  msUntilNextCallingWindow,
  tryAcquireInstituteDialSlot,
  usageDateKey,
} from "./ai-calling.hours";
import { AiCallingRepository } from "./ai-calling.repository";
import type {
  CreateAgentInput,
  UpdateAgentInput,
  UpdateInstituteConfigInput,
  UpdatePlatformSettingsInput,
  UsageQuery,
} from "./ai-calling.validation";
import {
  buildIdempotencyKey,
  isInFlightCallStatus,
  isTerminalCallStatus,
  mapProviderCallStatus,
  type AiCallingJobPayload,
  type SarvamWebhookPayload,
} from "./ai-calling.types";

function callbackBaseUrl(): string {
  return (
    process.env.PUBLIC_API_BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  );
}

function isProduction(): boolean {
  return (process.env.NODE_ENV || "development") === "production";
}

export const AiCallingService = {
  // ─── Config APIs ───────────────────────────────────────────────────────────

  async getInstituteConfig(instituteId: string) {
    const [row, resolved] = await Promise.all([
      AiCallingRepository.findInstituteConfig(instituteId),
      resolveAiCallingConfig(instituteId),
    ]);
    return toSafeInstituteConfigDto(row, resolved);
  },

  async updateInstituteConfig(instituteId: string, input: UpdateInstituteConfigInput) {
    if (input.agentId) {
      const agent = await AiCallingRepository.findAgentById(input.agentId);
      if (!agent || !agent.isActive) {
        throw new AppError("Agent not found or inactive", 400);
      }
    }

    const data: Omit<
      Prisma.InstituteAiCallingConfigUncheckedCreateInput,
      "id" | "instituteId"
    > = {};
    if (input.agentId !== undefined) data.agentId = input.agentId;
    if (input.fromNumber !== undefined) data.fromNumber = input.fromNumber;
    if (input.callingScript !== undefined) data.callingScript = input.callingScript;
    if (input.callingHoursStart !== undefined) data.callingHoursStart = input.callingHoursStart;
    if (input.callingHoursEnd !== undefined) data.callingHoursEnd = input.callingHoursEnd;
    if (input.callingDays !== undefined) {
      data.callingDays = input.callingDays as Prisma.InputJsonValue;
    }
    if (input.dailyCallLimit !== undefined) data.dailyCallLimit = input.dailyCallLimit;
    if (input.maxAttemptsPerLead !== undefined) {
      data.maxAttemptsPerLead = input.maxAttemptsPerLead;
    }
    if (input.retryDelayMinutes !== undefined) {
      data.retryDelayMinutes = input.retryDelayMinutes;
    }
    if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;

    const row = await AiCallingRepository.upsertInstituteConfig(instituteId, data);
    const resolved = await resolveAiCallingConfig(instituteId);
    return toSafeInstituteConfigDto(row, resolved);
  },

  async getUsage(instituteId: string, query: UsageQuery) {
    const days = query.days ?? 14;
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const fromKey = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
    );
    const toKey = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

    const rows = await AiCallingRepository.listUsage(instituteId, fromKey, toKey);
    const totals = rows.reduce(
      (acc, r) => {
        acc.initiatedCount += r.initiatedCount;
        acc.completedCount += r.completedCount;
        acc.durationSeconds += r.durationSeconds;
        return acc;
      },
      { initiatedCount: 0, completedCount: 0, durationSeconds: 0 }
    );

    return { from: fromKey, to: toKey, totals, days: rows };
  },

  async listActiveAgents() {
    return AiCallingRepository.listActiveAgents();
  },

  async getCallLogById(id: string, instituteId: string) {
    const log = await AiCallingRepository.findCallLogById(id, instituteId);
    if (!log) throw new AppError("Call log not found", 404);
    return log;
  },

  // ─── Super Admin platform ──────────────────────────────────────────────────

  async getPlatformSettings() {
    const row = await AiCallingRepository.getPlatformSettings();
    return toSafePlatformDto(row);
  },

  async updatePlatformSettings(input: UpdatePlatformSettingsInput) {
    const existing = await AiCallingRepository.getPlatformSettings();
    const existingCreds = decryptCredentials(existing.encryptedCredentials);
    const existingWebhook = decryptCredentials(existing.encryptedWebhookSecret);

    let nextCreds = { ...existingCreds };
    if (input.replaceCredentials) {
      nextCreds = {};
    }
    if (input.credentials) {
      for (const [k, v] of Object.entries(input.credentials)) {
        if (typeof v === "string" && v.trim()) nextCreds[k] = v.trim();
      }
    }

    let nextWebhook = { ...existingWebhook };
    if (input.webhookSecret !== undefined) {
      if (input.webhookSecret === null || input.webhookSecret === "") {
        nextWebhook = {};
      } else {
        nextWebhook = { webhookSecret: input.webhookSecret.trim() };
      }
    } else if (input.credentials?.webhookSecret) {
      nextWebhook = { webhookSecret: input.credentials.webhookSecret.trim() };
    }

    const primary = nextCreds.telephonyApiKey || nextCreds.apiKey || null;
    const row = await AiCallingRepository.updatePlatformSettings({
      telephonyBaseUrl:
        input.telephonyBaseUrl === undefined
          ? undefined
          : input.telephonyBaseUrl || null,
      defaultConcurrency: input.defaultConcurrency,
      encryptedCredentials:
        Object.keys(nextCreds).length > 0 ? encryptCredentials(nextCreds) : null,
      credentialFingerprint: fingerprintSecret(primary),
      encryptedWebhookSecret:
        Object.keys(nextWebhook).length > 0
          ? encryptCredentials(nextWebhook)
          : null,
    });

    return toSafePlatformDto(row);
  },

  async listPlatformAgents() {
    return AiCallingRepository.listAgents();
  },

  async createPlatformAgent(input: CreateAgentInput) {
    return AiCallingRepository.createAgent({
      name: input.name,
      provider: input.provider ?? "SARVAM",
      providerAppId: input.providerAppId ?? null,
      defaultScript: input.defaultScript ?? null,
      isActive: input.isActive ?? true,
    });
  },

  async updatePlatformAgent(id: string, input: UpdateAgentInput) {
    const existing = await AiCallingRepository.findAgentById(id);
    if (!existing) throw new AppError("Agent not found", 404);
    return AiCallingRepository.updateAgent(id, {
      name: input.name,
      provider: input.provider,
      providerAppId: input.providerAppId === undefined ? undefined : input.providerAppId,
      defaultScript: input.defaultScript === undefined ? undefined : input.defaultScript,
      isActive: input.isActive,
    });
  },

  async deletePlatformAgent(id: string) {
    const existing = await AiCallingRepository.findAgentById(id);
    if (!existing) throw new AppError("Agent not found", 404);
    await AiCallingRepository.deleteAgent(id);
    return { id };
  },

  async getInstituteConfigAsSuperAdmin(instituteId: string) {
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true, name: true, code: true },
    });
    if (!institute) throw new AppError("Institute not found", 404);
    const config = await this.getInstituteConfig(instituteId);
    return { institute, config };
  },

  async updateInstituteConfigAsSuperAdmin(
    instituteId: string,
    input: UpdateInstituteConfigInput
  ) {
    const institute = await prisma.institute.findUnique({
      where: { id: instituteId },
      select: { id: true },
    });
    if (!institute) throw new AppError("Institute not found", 404);
    return this.updateInstituteConfig(instituteId, input);
  },

  // ─── Dial / queue ─────────────────────────────────────────────────────────

  async enqueueInitialLeadCall(lead: {
    id: string;
    phoneNumber: string;
    createdById: string;
    instituteId: string;
    branchId?: string | null;
    importJobId?: string | null;
  }): Promise<{ queued: boolean; callLogId?: string; skipped?: string }> {
    const hasNonFailed = await AiCallingRepository.hasNonFailedAttempt(lead.id);
    if (hasNonFailed) {
      return { queued: false, skipped: "non_failed_attempt_exists" };
    }
    // Next attempt number (1 if none; bumps past prior FAILED rows for new idempotency keys)
    return this.enqueueLeadCall(lead);
  },

  async enqueueLeadCall(
    lead: {
      id: string;
      phoneNumber: string;
      createdById: string;
      instituteId: string;
      branchId?: string | null;
      importJobId?: string | null;
    },
    options: { attemptNumber?: number } = {}
  ): Promise<{ queued: boolean; callLogId?: string; skipped?: string }> {
    const config = await resolveAiCallingConfig(lead.instituteId);

    let attemptNumber = options.attemptNumber;
    if (!attemptNumber) {
      const latest = await AiCallingRepository.findLatestAttempt(lead.id);
      attemptNumber = (latest?.attemptNumber ?? 0) + 1;
    }

    if (attemptNumber > config.maxAttemptsPerLead) {
      return { queued: false, skipped: "max_attempts_reached" };
    }

    const idempotencyKey = buildIdempotencyKey(
      lead.instituteId,
      lead.id,
      attemptNumber
    );

    const existing = await AiCallingRepository.findCallLogByIdempotencyKey(
      idempotencyKey
    );
    if (existing) {
      if (isTerminalCallStatus(existing.status) || isInFlightCallStatus(existing.status)) {
        return {
          queued: false,
          callLogId: existing.id,
          skipped: isTerminalCallStatus(existing.status)
            ? "already_terminal"
            : "already_in_flight",
        };
      }
    }

    if (!config.hasTelephony || !config.isEnabled) {
      const callLog = await this.createLocalFailedCallLog(lead, {
        attemptNumber,
        idempotencyKey,
        agentId: config.agentId,
        fromNumber: config.fromNumber || null,
        reason: !config.isEnabled
          ? "AI Calling is disabled for this institute"
          : "Telephony not configured (set Integration override, platform settings, or TELEPHONY_* env)",
      });
      await this.applyTerminalCallStatus(lead.id, "FAILED");
      return { queued: false, callLogId: callLog.id, skipped: "telephony_unavailable" };
    }

    let callLog;
    try {
      callLog = existing
        ? existing
        : await AiCallingRepository.createCallLog({
            instituteId: lead.instituteId,
            branchId: lead.branchId ?? null,
            importJobId: lead.importJobId ?? null,
            agentId: config.agentId,
            leadId: lead.id,
            fromNumber: config.fromNumber || null,
            externalCallId: `queued_${lead.id}_${attemptNumber}_${Date.now()}`,
            status: "INITIATED",
            duration: 0,
            attemptNumber,
            idempotencyKey,
            startedAt: new Date(),
          });
    } catch (err: unknown) {
      // Unique idempotency race
      const again = await AiCallingRepository.findCallLogByIdempotencyKey(
        idempotencyKey
      );
      if (again) {
        return { queued: false, callLogId: again.id, skipped: "idempotent_race" };
      }
      throw err;
    }

    try {
      const { aiCallingQueue } = await import("../../queues/ai-calling.queue");
      const { defaultJobOptions, QUEUE_PRIORITY } = await import(
        "../../queues/queue"
      );
      const payload: AiCallingJobPayload = {
        callLogId: callLog.id,
        leadId: lead.id,
        instituteId: lead.instituteId,
      };
      await aiCallingQueue.add(
        "lead-ai-call",
        payload,
        defaultJobOptions(QUEUE_PRIORITY.USER_FACING)
      );
      return { queued: true, callLogId: callLog.id };
    } catch (err) {
      logger.error(
        { err, leadId: lead.id },
        "[AiCalling] Failed to enqueue; marking local failure"
      );
      await AiCallingRepository.updateCallLog(callLog.id, {
        status: "FAILED",
        failureReason: "Failed to enqueue AI calling job",
        endedAt: new Date(),
        transcript:
          "AI call queued locally. Redis/queue unavailable or telephony misconfigured.",
      });
      await this.applyTerminalCallStatus(lead.id, "FAILED");
      return { queued: false, callLogId: callLog.id, skipped: "enqueue_failed" };
    }
  },

  async createLocalFailedCallLog(
    lead: {
      id: string;
      createdById: string;
      instituteId: string;
      branchId?: string | null;
      importJobId?: string | null;
    },
    opts: {
      attemptNumber: number;
      idempotencyKey: string;
      agentId: string | null;
      fromNumber: string | null;
      reason: string;
    }
  ) {
    try {
      return await AiCallingRepository.createCallLog({
        instituteId: lead.instituteId,
        branchId: lead.branchId ?? null,
        importJobId: lead.importJobId ?? null,
        agentId: opts.agentId,
        leadId: lead.id,
        fromNumber: opts.fromNumber,
        externalCallId: `local_${lead.id}_${opts.attemptNumber}_${Date.now()}`,
        status: "FAILED",
        duration: 0,
        attemptNumber: opts.attemptNumber,
        idempotencyKey: opts.idempotencyKey,
        failureReason: opts.reason,
        transcript: opts.reason,
        endedAt: new Date(),
      });
    } catch {
      const existing = await AiCallingRepository.findCallLogByIdempotencyKey(
        opts.idempotencyKey
      );
      if (existing) return existing;
      throw new AppError("Failed to create call log", 500);
    }
  },

  /**
   * Worker entry: reload config from DB; never trust job for secrets.
   */
  async processCallJob(payload: AiCallingJobPayload): Promise<void> {
    const { callLogId, leadId, instituteId } = payload;

    const callLog = await prisma.callLog.findFirst({
      where: { id: callLogId, instituteId, leadId },
    });
    if (!callLog) {
      throw new UnrecoverableError(`CallLog ${callLogId} not found for institute`);
    }

    if (isTerminalCallStatus(callLog.status)) {
      logger.info(
        { callLogId, status: callLog.status },
        "[AiCalling] Skipping terminal CallLog"
      );
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, instituteId },
    });
    if (!lead) {
      throw new UnrecoverableError(`Lead ${leadId} not found for institute`);
    }

    const config = await resolveAiCallingConfig(instituteId);
    if (!config.isEnabled) {
      await AiCallingRepository.updateCallLog(callLogId, {
        status: "FAILED",
        failureReason: "AI Calling disabled",
        endedAt: new Date(),
      });
      await this.applyTerminalCallStatus(leadId, "FAILED");
      throw new UnrecoverableError("AI Calling disabled for institute");
    }
    if (!config.hasTelephony) {
      await AiCallingRepository.updateCallLog(callLogId, {
        status: "FAILED",
        failureReason: "Missing telephony configuration",
        endedAt: new Date(),
      });
      await this.applyTerminalCallStatus(leadId, "FAILED");
      throw new UnrecoverableError("Missing telephony configuration");
    }

    if (
      !isWithinCallingHours({
        timezone: config.timezone,
        callingHoursStart: config.callingHoursStart,
        callingHoursEnd: config.callingHoursEnd,
        callingDays: config.callingDays,
      })
    ) {
      const delay = msUntilNextCallingWindow({
        timezone: config.timezone,
        callingHoursStart: config.callingHoursStart,
        callingHoursEnd: config.callingHoursEnd,
        callingDays: config.callingDays,
      });
      const { aiCallingQueue } = await import("../../queues/ai-calling.queue");
      const { defaultJobOptions, QUEUE_PRIORITY } = await import(
        "../../queues/queue"
      );
      await aiCallingQueue.add("lead-ai-call", payload, {
        ...defaultJobOptions(QUEUE_PRIORITY.BULK),
        delay: Math.max(delay, 60_000),
      });
      logger.info(
        { callLogId, instituteId, delay },
        "[AiCalling] Outside calling hours — requeued"
      );
      return;
    }

    const dateKey = usageDateKey(new Date(), config.timezone);
    if (config.dailyCallLimit != null) {
      const usage = await AiCallingRepository.getUsageDaily(instituteId, dateKey);
      if ((usage?.initiatedCount ?? 0) >= config.dailyCallLimit) {
        const delay = msUntilNextCallingWindow({
          timezone: config.timezone,
          callingHoursStart: config.callingHoursStart || "09:00",
          callingHoursEnd: config.callingHoursEnd,
          callingDays: config.callingDays,
        });
        const { aiCallingQueue } = await import("../../queues/ai-calling.queue");
        const { defaultJobOptions, QUEUE_PRIORITY } = await import(
          "../../queues/queue"
        );
        await aiCallingQueue.add("lead-ai-call", payload, {
          ...defaultJobOptions(QUEUE_PRIORITY.BULK),
          delay: Math.max(delay || 60 * 60 * 1000, 60_000),
        });
        logger.info(
          { callLogId, instituteId },
          "[AiCalling] Daily limit reached — requeued"
        );
        return;
      }
    }

    const rate = await tryAcquireInstituteDialSlot(instituteId);
    if (!rate.allowed) {
      const { aiCallingQueue } = await import("../../queues/ai-calling.queue");
      const { defaultJobOptions, QUEUE_PRIORITY } = await import(
        "../../queues/queue"
      );
      await aiCallingQueue.add("lead-ai-call", payload, {
        ...defaultJobOptions(QUEUE_PRIORITY.BULK),
        delay: 15_000,
      });
      logger.info(
        { callLogId, instituteId, count: rate.count },
        "[AiCalling] Institute rate limited — requeued"
      );
      return;
    }

    try {
      const response = await initiateCall(
        {
          to: lead.phoneNumber,
          from: config.fromNumber || "",
          callbackUrl: `${callbackBaseUrl()}/api/v1/webhooks/sarvam/callback`,
          metadata: {
            leadId: lead.id,
            instituteId,
            callLogId,
            attemptNumber: String(callLog.attemptNumber),
          },
        },
        {
          baseUrl: config.telephonyBaseUrl,
          apiKey: config.telephonyApiKey,
        }
      );

      await AiCallingRepository.updateCallLog(callLogId, {
        externalCallId: response.callId || callLog.externalCallId,
        status: mapProviderCallStatus(response.status || "INITIATED"),
        fromNumber: config.fromNumber || callLog.fromNumber,
        agentId: config.agentId,
        startedAt: callLog.startedAt ?? new Date(),
      });

      await AiCallingRepository.incrementUsage(instituteId, dateKey, {
        initiated: 1,
      });
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      const message = err instanceof Error ? err.message : "Telephony initiate failed";

      if (status && status >= 400 && status < 500) {
        await AiCallingRepository.updateCallLog(callLogId, {
          status: "FAILED",
          failureReason: message,
          endedAt: new Date(),
        });
        await this.applyTerminalCallStatus(leadId, "FAILED");
        throw new UnrecoverableError(`Non-retriable telephony error: ${message}`);
      }

      logger.error({ err, callLogId, leadId }, "[AiCalling] Telephony initiate failed");
      throw err;
    }
  },

  async applyTerminalCallStatus(leadId: string, status: string): Promise<void> {
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
  },

  // ─── Manual trigger (preserve POST /leads/:id/ai-call) ─────────────────────

  async triggerLeadCall(leadId: string, currentUser: AuthUser) {
    const lead = await LeadRepository.findLeadById(leadId, currentUser.instituteId);
    if (!lead) throw new AppError("Lead not found", 404);

    // Branch isolation for center managers
    if (
      currentUser.roles?.includes("CENTER_MANAGER") &&
      currentUser.branchId &&
      lead.branchId !== currentUser.branchId
    ) {
      throw new AppError("Lead not found", 404);
    }

    const result = await this.enqueueLeadCall({
      id: lead.id,
      phoneNumber: lead.phoneNumber,
      createdById: lead.createdById,
      instituteId: lead.instituteId,
      branchId: lead.branchId,
      importJobId: lead.importJobId,
    });

    const callLog = result.callLogId
      ? await prisma.callLog.findUnique({ where: { id: result.callLogId } })
      : null;

    const userId = currentUser.userId || currentUser.id;
    await LeadActivityService.logActivity(
      lead.id,
      result.queued ? "CALL_COMPLETED" : "NOTE_ADDED",
      result.queued
        ? "AI voice call queued"
        : `AI voice call not queued (${result.skipped || "skipped"})`,
      {
        userId,
        description: result.queued
          ? "AI call job enqueued for institute dialer"
          : `Skipped: ${result.skipped}`,
        metadata: {
          callId: result.callLogId,
          queued: result.queued,
          skipped: result.skipped,
        },
      }
    );

    return {
      success: result.queued || result.skipped === "telephony_unavailable",
      call: callLog,
      message: result.queued
        ? "AI voice call queued"
        : result.skipped === "telephony_unavailable"
          ? "AI call recorded locally — configure telephony to place live calls"
          : `AI call not started: ${result.skipped}`,
    };
  },

  // ─── Webhook ───────────────────────────────────────────────────────────────

  verifyWebhookSecret(provided: string | undefined | null): {
    ok: boolean;
    reason?: string;
  } {
    // Synchronous check uses env; async path loads platform secret in handler
    return { ok: true, reason: provided || undefined };
  },

  async assertWebhookAuthorized(
    providedSecret: string | undefined | null
  ): Promise<void> {
    const platform = await AiCallingRepository.getPlatformSettings();
    const platformWebhook = decryptCredentials(platform.encryptedWebhookSecret);
    const platformCreds = decryptCredentials(platform.encryptedCredentials);
    const expected =
      platformWebhook.webhookSecret ||
      platformCreds.webhookSecret ||
      process.env.AI_CALLING_WEBHOOK_SECRET ||
      process.env.SARVAM_WEBHOOK_SECRET ||
      "";

    if (!expected) {
      if (isProduction()) {
        throw new AppError("Webhook secret not configured", 401);
      }
      logger.warn(
        "[AiCalling] Webhook secret not configured — allowing in non-production"
      );
      return;
    }

    if (!providedSecret || providedSecret !== expected) {
      throw new AppError("Invalid webhook secret", 401);
    }
  },

  async handleSarvamWebhook(payload: SarvamWebhookPayload): Promise<void> {
    const attemptId = payload.attempt_id;
    if (!attemptId) {
      logger.warn("[AiCalling] Webhook missing attempt_id");
      return;
    }

    const mappedStatus = mapProviderCallStatus(payload.status);
    const transcriptText = payload.interaction_transcript
      ? payload.interaction_transcript.map((t) => `${t.role}: ${t.text}`).join("\n")
      : null;
    const recordingUrl = payload.recording_url || payload.recordingUrl || null;
    const duration = payload.duration ?? 0;
    const interestStatus =
      (payload.final_agent_variables?.interestStatus as string | undefined) ||
      (payload.final_agent_variables?.interest_status as string | undefined) ||
      null;
    const aiSummary =
      (payload.final_agent_variables?.summary as string | undefined) ||
      (payload.final_agent_variables?.aiSummary as string | undefined) ||
      null;

    let callLog = await AiCallingRepository.findCallLogByExternalId(attemptId);

    // Fallback: metadata.leadId + instituteId only (never phone-only cross-tenant)
    if (!callLog && payload.metadata?.leadId && payload.metadata?.instituteId) {
      callLog = await prisma.callLog.findFirst({
        where: {
          leadId: payload.metadata.leadId,
          instituteId: payload.metadata.instituteId,
          status: { in: [...IN_FLIGHT_STATUSES] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            select: { id: true, instituteId: true, createdById: true, stage: true },
          },
        },
      });
    }

    if (!callLog) {
      // Last resort: phone match ONLY with instituteId from metadata
      const instituteId = payload.metadata?.instituteId;
      if (instituteId && payload.customer_number) {
        const phoneDigits = payload.customer_number.replace(/\D/g, "").slice(-10);
        if (phoneDigits.length === 10) {
          const lead = await prisma.lead.findFirst({
            where: {
              instituteId,
              status: "ACTIVE",
              OR: [
                { normalizedPhone: phoneDigits },
                { phoneNumber: { contains: phoneDigits } },
              ],
            },
            select: { id: true, instituteId: true, createdById: true, stage: true, branchId: true },
          });
          if (lead) {
            const existingInFlight = await prisma.callLog.findFirst({
              where: {
                leadId: lead.id,
                instituteId,
                status: { in: [...IN_FLIGHT_STATUSES] },
              },
              orderBy: { createdAt: "desc" },
              include: {
                lead: {
                  select: {
                    id: true,
                    instituteId: true,
                    createdById: true,
                    stage: true,
                  },
                },
              },
            });
            callLog = existingInFlight;
            if (!callLog) {
              logger.warn(
                { attemptId, instituteId, leadId: lead.id },
                "[AiCalling] Webhook for unknown CallLog — ignoring create without prior dial"
              );
            }
          }
        }
      }
    }

    if (!callLog) {
      logger.warn(
        { attemptId, status: mappedStatus },
        "[AiCalling] No CallLog matched for webhook — skipping"
      );
      return;
    }

    const instituteId = callLog.instituteId;
    const leadId = callLog.leadId;

    await AiCallingRepository.updateCallLog(callLog.id, {
      externalCallId: attemptId,
      status: mappedStatus,
      duration,
      transcript: transcriptText,
      recordingUrl,
      aiSummary,
      interestStatus,
      failureReason: payload.failure_reason || null,
      providerPayload: payload as unknown as Prisma.InputJsonValue,
      endedAt: isTerminalCallStatus(mappedStatus) ? new Date() : undefined,
      ...(leadId ? { leadId } : {}),
    });

    const config = await resolveAiCallingConfig(instituteId);
    const dateKey = usageDateKey(new Date(), config.timezone);
    if (isTerminalCallStatus(mappedStatus)) {
      await AiCallingRepository.incrementUsage(instituteId, dateKey, {
        completed: mappedStatus === "COMPLETED" ? 1 : 0,
        durationSeconds: duration,
      });
    }

    if (leadId) {
      await LeadActivityService.logActivity(
        leadId,
        "CALL_COMPLETED",
        `AI Call completed with status: ${mappedStatus}`,
        {
          description: `Duration: ${duration}s. Attempt: ${attemptId}`,
          metadata: { attempt_id: attemptId, status: mappedStatus, duration },
        }
      );
      await this.applyTerminalCallStatus(leadId, mappedStatus);

      if (isTerminalCallStatus(mappedStatus)) {
        try {
          const { LeadAiOutcomeService } = await import(
            "../leads/services/lead-ai-outcome.service"
          );
          await LeadAiOutcomeService.process(callLog.id);
        } catch (err) {
          logger.error(
            { err, callLogId: callLog.id, leadId },
            "[AiCalling] LeadAiOutcomeService.process failed"
          );
        }
      }
    }

    logger.info(
      { attemptId, status: mappedStatus, duration, leadId, instituteId },
      "[AiCalling] CallLog updated from webhook"
    );
  },
};

const IN_FLIGHT_STATUSES = ["INITIATED", "RINGING", "ANSWERED"] as const;
