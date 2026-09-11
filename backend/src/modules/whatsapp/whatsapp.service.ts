/**
 * WhatsApp automation engine + channel abstraction.
 *
 * @module modules/whatsapp/whatsapp.service
 */
import { isValidIndianPhone, normalizePhone } from "../../utils/phone";
import { logger } from "../../config/logger";
import { msg91Provider } from "./integrations/msg91.provider";
import type {
  IWhatsAppProvider,
  SendWhatsAppTemplateOptions,
  SendWhatsAppResult,
  TriggerNotificationInput,
  NotificationListResponse,
  UnreadCountResponse,
  CreateNotificationPayload,
  NotificationQueryFilters,
} from "./whatsapp.types";
import * as repo from "./whatsapp.repository";
import { whatsappQueue } from "./whatsapp.queue";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import {
  NotificationEvent,
  NotificationStatus,
  SkipReason,
  SYSTEM_AUTOMATION_CATALOG,
  SYSTEM_AUTOMATION_EVENTS,
  normalizeAutomationEvent,
  getAutomationMeta,
  formatAutomationTimingLabel,
} from "./whatsapp.constants";
import {
  applyTemplateVariableMap,
  getVariableMapFromConfig,
  invalidVariableMapTargets,
  isVariableMapComplete,
} from "./variable-map.util";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { buildMeta } from "../../utils/pagination";
import { isWhatsappProviderConnected } from "../integrations/integration.service";
import { createAuditLog } from "../../utils/audit-log.util";
import { AppError } from "../../middlewares/error.middleware";

class WhatsAppService {
  constructor(private readonly provider: IWhatsAppProvider) {}

  async sendTemplate(options: SendWhatsAppTemplateOptions): Promise<SendWhatsAppResult> {
    const rawPhone = options.phone.replace(/^\+/, "").replace(/^91/, "");

    if (!isValidIndianPhone(rawPhone)) {
      const err = new Error(`Invalid Indian phone number: ${options.phone}`) as Error & {
        code?: string;
        nonRetriable?: boolean;
      };
      err.code = "INVALID_PHONE";
      err.nonRetriable = true;
      throw err;
    }

    const normalizedPhone = normalizePhone(options.phone);
    logger.debug(
      { campaign: options.campaignName, phone: normalizedPhone },
      "[whatsapp] Sending template"
    );

    return this.provider.sendTemplate({ ...options, phone: normalizedPhone });
  }

  async sendTestMessage(
    phone: string,
    name: string,
    campaignName: string,
    templateParams: string[],
    instituteId?: string
  ): Promise<SendWhatsAppResult> {
    return this.sendTemplate({ phone, name, campaignName, templateParams, instituteId });
  }
}

export const whatsAppService = new WhatsAppService(msg91Provider);

type EvaluateOptions = TriggerNotificationInput & {
  isTest?: boolean;
  /** Skip creating SKIPPED rows for noisy cron paths when desired */
  persistSkips?: boolean;
};

const persistSkip = async (
  input: EvaluateOptions,
  reason: SkipReason,
  extras?: {
    userId?: string;
    studentId?: string;
    templateId?: string;
    phone?: string;
    name?: string;
  }
) => {
  if (input.persistSkips === false && !input.isTest) {
    logger.info(
      { event: input.event, instituteId: input.instituteId, reason },
      "[whatsapp.engine] Skipped (not persisted)"
    );
    return null;
  }

  return repo.createNotification({
    instituteId: input.instituteId,
    userId: extras?.userId ?? input.userId,
    studentId: extras?.studentId ?? input.studentId,
    event: normalizeAutomationEvent(input.event),
    channel: "WHATSAPP",
    templateId: extras?.templateId,
    status: NotificationStatus.SKIPPED,
    skipReason: reason,
    isTest: input.isTest ?? false,
    metadata: {
      ...input.metadata,
      templateParams: input.templateParams,
      recipientPhone: extras?.phone,
      recipientName: extras?.name,
      skipReason: reason,
    },
  });
};

/**
 * V1 automation engine — all business modules should call this (or triggerNotification alias).
 */
export const evaluateAndEnqueueSystemAutomation = async (input: EvaluateOptions) => {
  const instituteId = input.instituteId;
  const event = normalizeAutomationEvent(input.event);
  let templateParams: Record<string, string> = { ...(input.templateParams || {}) };
  const key = input.idempotencyKey
    ? `${instituteId}:${input.idempotencyKey}`
    : undefined;

  if (input.metadata?.source === "IMPORT" || input.metadata?.bulkImport === true) {
    return persistSkip(input, SkipReason.BULK_IMPORT_SUPPRESSED);
  }

  // 1. Global master switch
  const config = await repo.getOrCreateAutomationConfig(instituteId);
  if (!config.enabled) {
    return persistSkip(input, SkipReason.GLOBAL_AUTOMATION_DISABLED);
  }

  // 2. Per-automation rule (missing or disabled = do not send)
  await repo.ensureInstituteAutomationRules(instituteId);
  const rule = await repo.findRuleByEvent(instituteId, event, "WHATSAPP");
  if (!rule || !rule.enabled) {
    return persistSkip(input, SkipReason.AUTOMATION_DISABLED);
  }

  // 3. Template (rule.templateId preferred, else active by event)
  let template = rule.templateId
    ? await repo.findTemplateById(rule.templateId, instituteId)
    : null;
  if (!template) {
    template = await repo.findTemplateByEvent(instituteId, event);
  }
  if (!template) {
    return persistSkip(input, SkipReason.TEMPLATE_MISSING);
  }
  if (template.status !== "ACTIVE") {
    return persistSkip(input, SkipReason.TEMPLATE_INACTIVE, { templateId: template.id });
  }

  // 4. Provider connected
  const providerOk = await isWhatsappProviderConnected(instituteId);
  if (!providerOk) {
    return persistSkip(input, SkipReason.MSG91_NOT_CONFIGURED, { templateId: template.id });
  }

  // 5. Recipient
  let targetUserId = input.userId;
  let targetStudentId = input.studentId;
  let branchId: string | undefined;
  let recipientUser: {
    phone?: string | null;
    whatsappEnabled?: boolean | null;
    name?: string | null;
  } | null = null;

  if (targetStudentId) {
    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: { user: true },
    });
    if (student?.instituteId !== instituteId) {
      return persistSkip(input, SkipReason.RECIPIENT_NOT_FOUND);
    }
    if (student?.user) {
      recipientUser = student.user;
      targetUserId = student.user.id;
      branchId = student.branchId ?? undefined;
    }
  } else if (targetUserId) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (user?.instituteId !== instituteId) {
      return persistSkip(input, SkipReason.RECIPIENT_NOT_FOUND);
    }
    recipientUser = user;
    branchId = user?.branchId ?? undefined;
  }

  if (!recipientUser) {
    return persistSkip(input, SkipReason.RECIPIENT_NOT_FOUND, { templateId: template.id });
  }
  if (!recipientUser.phone) {
    return persistSkip(input, SkipReason.INVALID_PHONE, {
      templateId: template.id,
      userId: targetUserId,
      studentId: targetStudentId,
      name: recipientUser.name ?? undefined,
    });
  }

  const phoneDigits = recipientUser.phone.replace(/\D/g, "");
  const local10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
  if (!isValidIndianPhone(local10)) {
    return persistSkip(input, SkipReason.INVALID_PHONE, {
      templateId: template.id,
      userId: targetUserId,
      studentId: targetStudentId,
      phone: recipientUser.phone,
      name: recipientUser.name ?? undefined,
    });
  }

  if (recipientUser.whatsappEnabled === false) {
    return persistSkip(input, SkipReason.RECIPIENT_OPTED_OUT, {
      templateId: template.id,
      userId: targetUserId,
      studentId: targetStudentId,
      phone: recipientUser.phone,
      name: recipientUser.name ?? undefined,
    });
  }

  // 6. Required variables — apply rule variableMap (MSG91 slots ← Aadya fields)
  const requiredVars = (template.variables as string[]) || [];
  const variableMap = getVariableMapFromConfig(rule.configuration);
  templateParams = applyTemplateVariableMap(templateParams, variableMap, requiredVars);

  const missingVars = requiredVars.filter(
    (v) => templateParams[v] === undefined || templateParams[v] === null || templateParams[v] === ""
  );
  if (missingVars.length > 0) {
    return persistSkip(
      {
        ...input,
        templateParams,
        metadata: { ...input.metadata, missingVars, variableMap },
      },
      SkipReason.MISSING_VARIABLE,
      {
        templateId: template.id,
        userId: targetUserId,
        studentId: targetStudentId,
        phone: recipientUser.phone,
        name: recipientUser.name ?? undefined,
      }
    );
  }

  // 7. Idempotency
  if (key) {
    const isNew = await repo.createIdempotencyKey(key, instituteId);
    if (!isNew) {
      logger.info({ key, event }, "[whatsapp.engine] Duplicate idempotency key");
      return persistSkip(input, SkipReason.DUPLICATE_NOTIFICATION, {
        templateId: template.id,
        userId: targetUserId,
        studentId: targetStudentId,
        phone: recipientUser.phone,
        name: recipientUser.name ?? undefined,
      });
    }
  }

  // 8. Create + queue (optional delayMinutes for immediate-mode automations)
  const ruleConfig = (rule.configuration as Record<string, unknown>) || {};
  const delayMinutesRaw = Number(ruleConfig.delayMinutes);
  const delayMinutes =
    getAutomationMeta(event)?.timingMode === "immediate" &&
    Number.isFinite(delayMinutesRaw) &&
    delayMinutesRaw > 0
      ? Math.min(Math.floor(delayMinutesRaw), 7 * 24 * 60)
      : 0;
  const delayMs = delayMinutes * 60 * 1000;
  const scheduledAt = delayMs > 0 ? new Date(Date.now() + delayMs) : undefined;

  let notification;
  try {
    notification = await repo.createNotification({
      instituteId,
      userId: targetUserId,
      studentId: targetStudentId,
      branchId,
      event,
      channel: "WHATSAPP",
      templateId: template.id,
      isTest: input.isTest ?? false,
      title: input.isTest ? `[TEST] ${event}` : event,
      message: template.body ?? undefined,
      scheduledAt,
      metadata: {
        ...input.metadata,
        templateParams,
        recipientPhone: recipientUser.phone,
        recipientName: recipientUser.name,
        provider: "MSG91",
        campaignName: template.providerTemplateName,
        language: template.language,
        namespace: template.providerNamespace ?? undefined,
        isTest: input.isTest ?? false,
        delayMinutes: delayMinutes || undefined,
      },
    });
  } catch (err) {
    if (key) await repo.deleteIdempotencyKey(key).catch(() => {});
    throw err;
  }

  try {
    await whatsappQueue.add(
      "send-whatsapp",
      { notificationId: notification.id },
      {
        attempts: env.WHATSAPP_MAX_RETRIES,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        ...(delayMs > 0 ? { delay: delayMs } : {}),
      }
    );
  } catch (err: unknown) {
    const errorMsg = `Queue unavailable: ${err instanceof Error ? err.message : "unknown error"}`;
    await repo.updateNotificationStatus(notification.id, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: errorMsg,
    });
    if (key) await repo.deleteIdempotencyKey(key).catch(() => {});
    logger.error(
      { notificationId: notification.id, event, err },
      "[whatsapp.engine] Failed to enqueue"
    );
    throw err;
  }

  await repo.markNotificationQueued(notification.id);
  logger.info(
    { notificationId: notification.id, event, isTest: input.isTest },
    "[whatsapp.engine] Notification queued"
  );
  return notification;
};

/** Backward-compatible alias used by existing business modules. */
export const triggerNotification = async (input: TriggerNotificationInput) => {
  return evaluateAndEnqueueSystemAutomation(input);
};

// ─── Config / Automations CRUD ───────────────────────────────────────────────

export const getAutomationConfig = async (instituteId: string) => {
  return repo.getOrCreateAutomationConfig(instituteId);
};

export const patchAutomationConfig = async (
  currentUser: AuthUser,
  enabled: boolean
) => {
  const before = await repo.getOrCreateAutomationConfig(currentUser.instituteId);
  const updated = await repo.updateAutomationConfig(
    currentUser.instituteId,
    enabled,
    currentUser.id
  );
  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action: enabled ? "WHATSAPP_GLOBAL_ENABLED" : "WHATSAPP_GLOBAL_DISABLED",
    entityType: "WhatsAppAutomationConfig",
    entityId: updated.id,
    oldData: { enabled: before.enabled },
    newData: { enabled: updated.enabled },
  });
  return updated;
};

export const listAutomations = async (instituteId: string) => {
  await repo.ensureInstituteAutomationRules(instituteId);
  const [config, rules, templates] = await Promise.all([
    repo.getOrCreateAutomationConfig(instituteId),
    repo.findAllRules(instituteId),
    repo.findAllTemplates(instituteId),
  ]);

  const ruleByEvent = new Map(rules.map((r) => [r.event, r]));

  const automations = SYSTEM_AUTOMATION_CATALOG.map((meta) => {
    const rule = ruleByEvent.get(meta.event);
    const configuration =
      (rule?.configuration as Record<string, unknown>) ?? meta.defaultConfiguration ?? {};
    const includeFaculty = Boolean(configuration.includeFaculty);
    return {
      ...meta,
      timingLabel: formatAutomationTimingLabel(meta.event, configuration),
      recipientLabel:
        meta.event === NotificationEvent.CLASS_REMINDER && includeFaculty
          ? "Student + Faculty"
          : meta.recipientLabel,
      enabled: rule?.enabled ?? false,
      templateId: rule?.templateId ?? null,
      template: rule?.template
        ? {
            id: rule.template.id,
            name: rule.template.name,
            status: rule.template.status,
            providerTemplateName: rule.template.providerTemplateName,
            variables: Array.isArray(rule.template.variables)
              ? (rule.template.variables as string[])
              : [],
          }
        : null,
      configuration,
      ruleId: rule?.id ?? null,
    };
  });

  return {
    globalEnabled: config.enabled,
    automations,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      event: t.event,
      status: t.status,
      category: t.category,
      variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
    })),
  };
};

export const patchAutomation = async (
  currentUser: AuthUser,
  eventType: string,
  data: {
    enabled?: boolean;
    templateId?: string | null;
    configuration?: Record<string, unknown>;
  }
) => {
  const event = normalizeAutomationEvent(eventType);
  if (!SYSTEM_AUTOMATION_EVENTS.includes(event as (typeof SYSTEM_AUTOMATION_EVENTS)[number])) {
    throw new AppError("Unknown system automation type", 400);
  }

  const meta = getAutomationMeta(event);
  const allowedFields = Object.keys(meta?.sampleVariables ?? {});

  let resolvedTemplateId =
    data.templateId !== undefined ? data.templateId : undefined;
  let templateForValidation: Awaited<ReturnType<typeof repo.findTemplateById>> = null;

  if (data.templateId) {
    templateForValidation = await repo.findTemplateById(data.templateId, currentUser.instituteId);
    if (!templateForValidation) throw new AppError("Template not found", 404);
  }

  await repo.ensureInstituteAutomationRules(currentUser.instituteId);
  const existing = await repo.findRuleByEvent(currentUser.instituteId, event);

  if (resolvedTemplateId === undefined) {
    resolvedTemplateId = existing?.templateId ?? null;
  }
  if (!templateForValidation && resolvedTemplateId) {
    templateForValidation = await repo.findTemplateById(
      resolvedTemplateId,
      currentUser.instituteId
    );
  }

  const existingConfig =
    (existing?.configuration as Record<string, unknown>) ||
    meta?.defaultConfiguration ||
    {};

  let nextConfig: Record<string, unknown> = { ...existingConfig };
  if (data.configuration !== undefined) {
    nextConfig = { ...existingConfig, ...data.configuration };
    if (data.configuration.variableMap !== undefined) {
      nextConfig.variableMap = data.configuration.variableMap;
    }
  }

  const variableMap = getVariableMapFromConfig(nextConfig);
  if (Object.keys(variableMap).length > 0) {
    const bad = invalidVariableMapTargets(variableMap, allowedFields);
    if (bad.length > 0) {
      throw new AppError(
        `Invalid variable mapping for this automation: ${bad.join(", ")}`,
        400
      );
    }
  }

  const requiredVars = templateForValidation
    ? ((templateForValidation.variables as string[]) || [])
    : [];

  const willEnable = data.enabled === true;
  if (willEnable && requiredVars.length > 0 && !isVariableMapComplete(requiredVars, variableMap)) {
    throw new AppError(
      "Map all template variables before enabling this automation",
      400
    );
  }

  const previousMap = getVariableMapFromConfig(existingConfig);
  const mapChanged =
    JSON.stringify(previousMap) !== JSON.stringify(variableMap);

  const updated = await repo.upsertRule({
    instituteId: currentUser.instituteId,
    event,
    enabled: data.enabled ?? existing?.enabled ?? false,
    templateId: data.templateId !== undefined ? data.templateId : existing?.templateId,
    configuration: nextConfig,
  });

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action:
      data.enabled === true
        ? "WHATSAPP_AUTOMATION_ENABLED"
        : data.enabled === false
          ? "WHATSAPP_AUTOMATION_DISABLED"
          : mapChanged
            ? "WHATSAPP_AUTOMATION_VARIABLE_MAP_UPDATED"
            : "WHATSAPP_AUTOMATION_UPDATED",
    entityType: "NotificationRule",
    entityId: updated.id,
    oldData: existing
      ? {
          enabled: existing.enabled,
          templateId: existing.templateId,
          variableMap: previousMap,
        }
      : null,
    newData: {
      enabled: updated.enabled,
      templateId: updated.templateId,
      event,
      variableMap: mapChanged ? variableMap : undefined,
    },
  });

  return updated;
};

export const sendAutomationTest = async (
  currentUser: AuthUser,
  eventType: string,
  phone: string,
  name?: string
) => {
  const event = normalizeAutomationEvent(eventType);
  if (!SYSTEM_AUTOMATION_EVENTS.includes(event as (typeof SYSTEM_AUTOMATION_EVENTS)[number])) {
    throw new AppError("Unknown system automation type", 400);
  }

  const meta = getAutomationMeta(event);
  const sample = meta?.sampleVariables ?? {};

  // Temporarily require global + rule on for realistic test path,
  // but create a synthetic user context via phone override in metadata.
  // Resolve template first for clearer errors.
  await repo.ensureInstituteAutomationRules(currentUser.instituteId);
  const rule = await repo.findRuleByEvent(currentUser.instituteId, event);
  let template = rule?.templateId
    ? await repo.findTemplateById(rule.templateId, currentUser.instituteId)
    : null;
  if (!template) template = await repo.findTemplateByEvent(currentUser.instituteId, event);
  if (!template) throw new AppError("No template mapped for this automation", 400);
  if (template.status !== "ACTIVE") throw new AppError("Template is inactive", 400);

  const providerOk = await isWhatsappProviderConnected(currentUser.instituteId);
  if (!providerOk) throw new AppError("WhatsApp provider is not connected", 400);

  const config = await repo.getOrCreateAutomationConfig(currentUser.instituteId);
  if (!config.enabled) throw new AppError("Global WhatsApp automation is OFF", 400);
  if (!rule?.enabled) throw new AppError("This automation is OFF", 400);

  // Prefer explicit variableMap from rule; fall back to positional sample fill.
  const requiredVars = (template.variables as string[]) || [];
  const sampleValues = Object.values(sample);
  let templateParams: Record<string, string> = { ...sample };
  if (name?.trim()) {
    templateParams.student_name = name.trim();
    templateParams.recipient_name = name.trim();
  }

  const variableMap = getVariableMapFromConfig(rule?.configuration);
  if (Object.keys(variableMap).length > 0) {
    templateParams = applyTemplateVariableMap(templateParams, variableMap, requiredVars);
  } else {
    requiredVars.forEach((varName, index) => {
      if (templateParams[varName]) return;
      const positional = /^(?:var_|body_|header_)(\d+)$/i.exec(varName);
      if (positional) {
        const pos = Number(positional[1]) - 1;
        templateParams[varName] = sampleValues[pos] ?? `Sample ${positional[1]}`;
        return;
      }
      templateParams[varName] = sampleValues[index] ?? `Sample ${varName}`;
    });
  }

  for (const v of requiredVars) {
    if (!templateParams[v]) {
      throw new AppError(
        Object.keys(variableMap).length > 0
          ? `Mapped sample value missing for variable: ${v}. Check variable mapping.`
          : `Sample value missing for variable: ${v}. Map template variables on this automation.`,
        400
      );
    }
  }

  const rawPhone = phone.replace(/\D/g, "");
  const local10 = rawPhone.slice(-10);
  if (!isValidIndianPhone(local10)) {
    throw new AppError("Invalid test phone number", 400);
  }

  // Create a test notification that uses the caller's user as recipient, but override phone in metadata.
  // Worker reads metadata.recipientPhone first.
  const notification = await repo.createNotification({
    instituteId: currentUser.instituteId,
    userId: currentUser.id,
    event,
    channel: "WHATSAPP",
    templateId: template.id,
    isTest: true,
    title: `[TEST] ${meta?.label ?? event}`,
    message: template.body ?? undefined,
    status: NotificationStatus.PENDING,
    metadata: {
      templateParams,
      recipientPhone: phone.startsWith("+") ? phone : `+91${local10}`,
      recipientName: name || "Test User",
      provider: "MSG91",
      campaignName: template.providerTemplateName,
      language: template.language,
      namespace: template.providerNamespace ?? undefined,
      isTest: true,
    },
  });

  await whatsappQueue.add(
    "send-whatsapp",
    { notificationId: notification.id },
    {
      attempts: env.WHATSAPP_MAX_RETRIES,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
    }
  );
  await repo.markNotificationQueued(notification.id);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action: "WHATSAPP_TEST_SENT",
    entityType: "Notification",
    entityId: notification.id,
    newData: { event, phone: `***${local10.slice(-4)}` },
  });

  return notification;
};

export const getHistory = async (
  currentUser: AuthUser,
  query: {
    branchId?: string;
    studentId?: string;
    event?: string;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    isTest?: boolean;
  }
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const { notifications, total } = await repo.findNotifications({
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    studentId: query.studentId,
    event: query.event,
    status: query.status,
    channel: "WHATSAPP",
    isTest: query.isTest,
    search: query.search,
    fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
    toDate: query.toDate ? new Date(query.toDate) : undefined,
    page,
    limit,
  });

  const data = notifications.map((n) => {
    const meta = (n.metadata || {}) as Record<string, unknown>;
    return {
      id: n.id,
      createdAt: n.createdAt,
      sentAt: n.sentAt,
      event: n.event,
      status: n.status,
      skipReason: n.skipReason,
      errorMessage: n.errorMessage,
      isTest: n.isTest,
      template: n.template
        ? { id: n.template.id, name: n.template.name, providerTemplateName: n.template.providerTemplateName }
        : null,
      recipientName:
        n.student?.user?.name ||
        n.user?.name ||
        (meta.recipientName as string) ||
        null,
      phone:
        (meta.recipientPhone as string) ||
        n.student?.user?.phone ||
        n.user?.phone ||
        null,
      provider: (meta.provider as string) || "MSG91",
      providerMessageId: n.providerMessageId,
    };
  });

  return { data, meta: buildMeta(total, page, limit) };
};

export const getNotifications = async (
  currentUser: AuthUser,
  query: {
    branchId?: string;
    studentId?: string;
    event?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }
) => getHistory(currentUser, query);

export const getNotificationById = async (currentUser: AuthUser, id: string) => {
  const notification = await repo.findNotificationById(id, currentUser.instituteId);
  if (!notification) return null;
  if (!canAccessNotification(currentUser, notification)) return null;
  return notification;
};

export const resendNotification = async (currentUser: AuthUser, id: string) => {
  const notification = await repo.findNotificationById(id, currentUser.instituteId);
  if (!notification) throw new AppError("Notification not found", 404);
  if (!canAccessNotification(currentUser, notification)) {
    throw new AppError("Forbidden", 403);
  }

  await repo.updateNotificationStatus(id, {
    status: NotificationStatus.QUEUED,
    errorMessage: undefined,
  });

  try {
    await whatsappQueue.add(
      "send-whatsapp",
      { notificationId: notification.id },
      {
        attempts: env.WHATSAPP_MAX_RETRIES,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
  } catch (err: unknown) {
    const errorMsg = `Queue unavailable: ${err instanceof Error ? err.message : "unknown error"}`;
    await repo.updateNotificationStatus(id, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      errorMessage: errorMsg,
    });
    throw new AppError(errorMsg, 503);
  }

  return repo.findNotificationById(id, currentUser.instituteId);
};

const canAccessNotification = (currentUser: AuthUser, notification: {
  student?: { branchId?: string | null } | null;
  user?: { branchId?: string | null } | null;
  metadata?: unknown;
  branchId?: string | null;
}): boolean => {
  if (currentUser.roles.includes("ADMIN")) return true;
  const targetBranchId =
    notification.branchId ??
    notification.student?.branchId ??
    notification.user?.branchId ??
    (notification.metadata as { branchId?: string } | null)?.branchId;
  if (!targetBranchId) return false;
  return hasBranchAccess(currentUser, targetBranchId);
};

export const listTemplates = async (instituteId: string) => {
  return repo.findAllTemplates(instituteId);
};

export const createTemplate = async (
  currentUser: AuthUser,
  data: {
    name: string;
    event: string;
    providerTemplateName: string;
    providerTemplateId?: string | null;
    providerNamespace?: string | null;
    language?: string;
    variables: string[];
    category?: string;
    body?: string;
    status?: string;
  }
) => {
  const event = normalizeAutomationEvent(data.event);
  const created = await repo.createTemplate({
    ...data,
    event,
    instituteId: currentUser.instituteId,
  });
  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action: "WHATSAPP_TEMPLATE_CREATED",
    entityType: "NotificationTemplate",
    entityId: created.id,
    newData: { name: created.name, event: created.event },
  });
  return created;
};

export const updateTemplate = async (
  currentUser: AuthUser,
  id: string,
  data: Partial<{
    name: string;
    event: string;
    providerTemplateName: string;
    providerTemplateId: string | null;
    providerNamespace: string | null;
    language: string;
    variables: string[];
    status: string;
    category: string;
    body: string;
  }>
) => {
  const existing = await repo.findTemplateById(id, currentUser.instituteId);
  if (!existing) throw new AppError("Template not found", 404);

  const payload = {
    ...data,
    ...(data.event ? { event: normalizeAutomationEvent(data.event) } : {}),
  };
  await repo.updateTemplate(id, currentUser.instituteId, payload);
  const updated = await repo.findTemplateById(id, currentUser.instituteId);

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action:
      data.status === "ACTIVE"
        ? "WHATSAPP_TEMPLATE_ENABLED"
        : data.status === "INACTIVE" || data.status === "SYNCED"
          ? "WHATSAPP_TEMPLATE_DISABLED"
          : "WHATSAPP_TEMPLATE_UPDATED",
    entityType: "NotificationTemplate",
    entityId: id,
    oldData: { name: existing.name, status: existing.status },
    newData: { name: updated?.name, status: updated?.status },
  });
  return updated;
};

export const deleteTemplate = async (currentUser: AuthUser, id: string) => {
  const existing = await repo.findTemplateById(id, currentUser.instituteId);
  if (!existing) throw new AppError("Template not found", 404);
  await repo.deleteTemplate(id, currentUser.instituteId);
  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action: "WHATSAPP_TEMPLATE_DELETED",
    entityType: "NotificationTemplate",
    entityId: id,
    oldData: { name: existing.name },
  });
  return { success: true };
};

export const toggleTemplateStatus = async (
  currentUser: AuthUser,
  id: string,
  status: "ACTIVE" | "INACTIVE" | "SYNCED"
) => updateTemplate(currentUser, id, { status });

/** Fetch approved templates from MSG91 without mutating local DB. */
export const listProviderTemplates = async (currentUser: AuthUser) => {
  const templates = await msg91Provider.getTemplates(currentUser.instituteId, {
    pageSize: 100,
    pageNum: 1,
  });
  return templates.map((t) => ({
    name: t.name,
    language: t.language,
    status: t.status,
    namespace: t.namespace ?? null,
    id: t.id ?? null,
    category: t.category ?? null,
  }));
};

/**
 * Sync MSG91 templates into NotificationTemplate rows as SYNCED/INACTIVE.
 * Never auto-activates templates or enables automations.
 */
export const syncTemplatesFromMsg91 = async (
  currentUser: AuthUser,
  options?: { templateStatus?: string; pageSize?: number }
) => {
  const providerOk = await isWhatsappProviderConnected(currentUser.instituteId);
  if (!providerOk) {
    throw new AppError("MSG91 is not configured", 400);
  }

  const remote = await msg91Provider.getTemplates(currentUser.instituteId, {
    templateStatus: options?.templateStatus,
    pageSize: Math.min(500, options?.pageSize ?? 100),
    pageNum: 1,
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const results: Array<{ name: string; language: string; action: string; id?: string }> = [];

  for (const t of remote) {
    if (!t.name) {
      skipped += 1;
      continue;
    }

    // Prefer approved language variants; still import others as SYNCED for mapping later
    const statusUpper = (t.status || "").toUpperCase();
    const isApproved = statusUpper === "APPROVED" || statusUpper === "ACTIVE";

    const existing = await repo.findTemplateByProviderName(
      currentUser.instituteId,
      t.name,
      t.language
    );

    const rawVars = Array.isArray((t.raw as { variables?: unknown })?.variables)
      ? ((t.raw as { variables: string[] }).variables || [])
      : [];
    const bodyVars = rawVars
      .map((v) => String(v))
      .filter((v) => v.startsWith("body_"))
      .map((_, idx) => `var_${idx + 1}`);

    if (existing) {
      // Refresh provider metadata only; never force ACTIVE
      await repo.updateTemplate(existing.id, currentUser.instituteId, {
        providerTemplateId: t.id ?? existing.providerTemplateId,
        providerNamespace: t.namespace ?? existing.providerNamespace,
        language: t.language || existing.language,
        category: t.category ?? existing.category ?? undefined,
        ...(existing.status === "ACTIVE"
          ? {}
          : { status: existing.status === "INACTIVE" ? "INACTIVE" : "SYNCED" }),
        ...(((existing.variables as string[]) || []).length === 0 && bodyVars.length
          ? { variables: bodyVars }
          : {}),
      });
      updated += 1;
      results.push({
        name: t.name,
        language: t.language,
        action: isApproved ? "updated" : "updated_pending",
        id: existing.id,
      });
      continue;
    }

    const safeName = `msg91_${t.name}_${t.language || "en"}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 80);
    const createdRow = await repo.createTemplate({
      instituteId: currentUser.instituteId,
      name: safeName,
      event: "STUDENT_WELCOME",
      providerTemplateName: t.name,
      providerTemplateId: t.id ?? null,
      providerNamespace: t.namespace ?? null,
      language: t.language || "en",
      variables: bodyVars,
      category: t.category ?? undefined,
      body: undefined,
      status: "SYNCED",
    });
    created += 1;
    results.push({
      name: t.name,
      language: t.language,
      action: isApproved ? "created" : "created_pending",
      id: createdRow.id,
    });
  }

  await createAuditLog({
    userId: currentUser.id,
    instituteId: currentUser.instituteId,
    action: "WHATSAPP_TEMPLATES_SYNCED",
    entityType: "NotificationTemplate",
    entityId: currentUser.instituteId,
    newData: { created, updated, skipped, total: remote.length },
  });

  return { created, updated, skipped, total: remote.length, results };
};

export const listRules = async (instituteId: string) => repo.findAllRules(instituteId);

export const upsertRule = async (
  currentUser: AuthUser,
  data: {
    event: string;
    channel?: string;
    enabled: boolean;
    templateId?: string | null;
    configuration?: Record<string, unknown>;
  }
) =>
  patchAutomation(currentUser, data.event, {
    enabled: data.enabled,
    templateId: data.templateId,
    configuration: data.configuration,
  });

import { NotificationRepository as CanonicalNotificationRepo } from "../notifications/notification.repository";

export class NotificationService {
  static async getNotifications(
    instituteId: string,
    userId: string,
    filters: NotificationQueryFilters,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<NotificationListResponse> {
    return CanonicalNotificationRepo.listNotifications(
      instituteId,
      userId,
      filters,
      userRoles,
      userBranchId
    );
  }

  static async getUnreadCount(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ): Promise<UnreadCountResponse> {
    return CanonicalNotificationRepo.getUnreadCount(
      instituteId,
      userId,
      userRoles,
      userBranchId
    );
  }

  static async markAsRead(notificationId: string, userId: string) {
    return CanonicalNotificationRepo.markAsRead(notificationId, userId);
  }

  static async markAllAsRead(
    instituteId: string,
    userId: string,
    userRoles: string[] = [],
    userBranchId?: string | null
  ) {
    return CanonicalNotificationRepo.markAllAsRead(
      instituteId,
      userId,
      userRoles,
      userBranchId
    );
  }

  static async createNotification(payload: CreateNotificationPayload) {
    if (!payload.title || !payload.message || !payload.instituteId) {
      throw new Error("Title, message, and instituteId are required");
    }
    return CanonicalNotificationRepo.createNotification(payload);
  }

  static async deleteNotification(notificationId: string, userId: string) {
    return CanonicalNotificationRepo.deleteNotification(notificationId, userId);
  }
}
