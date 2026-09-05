import type { IntegrationType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
import { createAuditLog } from "../../utils/audit-log.util";
import {
  decryptCredentials,
  encryptCredentials,
  fingerprintSecret,
  pickPrimarySecret,
} from "../../utils/integration-credentials.util";
import type { AuthUser } from "../auth/auth.types";
import { toCardDto, toDetailDto } from "./integration.mapper";
import * as repo from "./integration.repository";
import {
  INTEGRATION_CATALOG,
  INTEGRATION_TYPES,
  type UpsertIntegrationInput,
} from "./integration.types";
import { runIntegrationTest } from "./providers/integration-test.provider";

const actorId = (user: AuthUser) => user.userId || user.id;

const assertType = (type: string): IntegrationType => {
  if (!INTEGRATION_TYPES.includes(type as IntegrationType)) {
    throw new AppError("Invalid integration type", 400);
  }
  return type as IntegrationType;
};

export const listIntegrationsService = async (currentUser: AuthUser) => {
  const rows = await repo.findAllByInstitute(currentUser.instituteId);
  const byType = new Map(rows.map((r) => [r.type, r]));
  return INTEGRATION_TYPES.map((type) => toCardDto(type, byType.get(type) ?? null));
};

export const getIntegrationService = async (
  currentUser: AuthUser,
  typeParam: string
) => {
  const type = assertType(typeParam);
  const row = await repo.findByInstituteAndType(currentUser.instituteId, type);
  return toDetailDto(type, row);
};

export const upsertIntegrationService = async (
  currentUser: AuthUser,
  typeParam: string,
  input: UpsertIntegrationInput
) => {
  const type = assertType(typeParam);
  if (type === "GOOGLE_WORKSPACE") {
    throw new AppError(
      "Use Google OAuth Connect to configure Google Workspace",
      400
    );
  }

  const meta = INTEGRATION_CATALOG[type];
  const existing = await repo.findByInstituteAndType(currentUser.instituteId, type);
  const provider = input.provider || existing?.provider || meta.defaultProvider;

  if (!meta.providers.includes(provider)) {
    throw new AppError(`Unsupported provider for ${type}`, 400);
  }

  let encryptedCredentials = existing?.encryptedCredentials ?? null;
  let credentialFingerprint = existing?.credentialFingerprint ?? null;
  let credentialsChanged = false;

  const incoming = input.credentials || {};
  const hasNewSecrets = Object.values(incoming).some(
    (v) => typeof v === "string" && v.trim().length > 0
  );

  if (hasNewSecrets || input.replaceCredentials) {
    const previous = decryptCredentials(existing?.encryptedCredentials);
    const merged = input.replaceCredentials
      ? { ...incoming }
      : { ...previous, ...incoming };
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
    }
    if (Object.keys(cleaned).length === 0) {
      encryptedCredentials = null;
      credentialFingerprint = null;
    } else {
      encryptedCredentials = encryptCredentials(cleaned);
      credentialFingerprint = fingerprintSecret(pickPrimarySecret(cleaned));
    }
    credentialsChanged = true;
  }

  const configuration =
    input.configuration !== undefined
      ? input.configuration
      : ((existing?.configuration as Record<string, unknown>) ?? {});

  const isConfigured =
    type === "GOOGLE_SHEETS"
      ? Boolean(configuration && Object.keys(configuration).length)
      : Boolean(encryptedCredentials);

  let status = existing?.status ?? "NOT_CONFIGURED";
  if (!isConfigured) {
    status = "NOT_CONFIGURED";
  } else if (
    credentialsChanged ||
    status === "NOT_CONFIGURED" ||
    status === "DISCONNECTED"
  ) {
    status = "CONFIGURED";
  }

  const row = await repo.upsertIntegration(currentUser.instituteId, type, {
    provider,
    status,
    isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
    configuration: configuration as Prisma.InputJsonValue,
    encryptedCredentials,
    credentialFingerprint,
    lastTestedAt: existing?.lastTestedAt ?? null,
    lastTestStatus: existing?.lastTestStatus ?? null,
    lastError: existing?.lastError ?? null,
    connectedById: existing?.connectedById ?? null,
    connectedAt: existing?.connectedAt ?? null,
  });

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: existing
      ? credentialsChanged
        ? "INTEGRATION_CREDENTIAL_CHANGED"
        : "INTEGRATION_UPDATED"
      : "INTEGRATION_CREATED",
    entityType: "Integration",
    entityId: row.id,
    oldData: existing
      ? {
          type,
          provider: existing.provider,
          status: existing.status,
          isEnabled: existing.isEnabled,
        }
      : null,
    newData: { type, provider, status, isEnabled: row.isEnabled },
  });

  return toDetailDto(type, row);
};

export const testIntegrationService = async (
  currentUser: AuthUser,
  typeParam: string
) => {
  const type = assertType(typeParam);
  const result = await runIntegrationTest(
    currentUser.instituteId,
    type,
    actorId(currentUser)
  );

  const existing = await repo.findByInstituteAndType(currentUser.instituteId, type);
  const meta = INTEGRATION_CATALOG[type];

  const row = await repo.upsertIntegration(currentUser.instituteId, type, {
    provider: existing?.provider || meta.defaultProvider,
    status: result.success ? "CONNECTED" : "ERROR",
    isEnabled: existing?.isEnabled ?? true,
    configuration: ((existing?.configuration as Prisma.InputJsonValue) ??
      {}) as Prisma.InputJsonValue,
    encryptedCredentials: existing?.encryptedCredentials ?? null,
    credentialFingerprint: existing?.credentialFingerprint ?? null,
    lastTestedAt: new Date(),
    lastTestStatus: result.success ? "SUCCESS" : "FAILED",
    lastError: result.success ? null : result.message,
    connectedById: existing?.connectedById ?? null,
    connectedAt: existing?.connectedAt ?? null,
  });

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "INTEGRATION_TESTED",
    entityType: "Integration",
    entityId: row.id,
    newData: { type, success: result.success },
  });

  return { ...result, integration: toDetailDto(type, row) };
};

export const disconnectIntegrationService = async (
  currentUser: AuthUser,
  typeParam: string
) => {
  const type = assertType(typeParam);
  const existing = await repo.findByInstituteAndType(currentUser.instituteId, type);
  const meta = INTEGRATION_CATALOG[type];

  const row = await repo.upsertIntegration(currentUser.instituteId, type, {
    provider: existing?.provider || meta.defaultProvider,
    status: "DISCONNECTED",
    isEnabled: false,
    configuration: ((existing?.configuration as Prisma.InputJsonValue) ??
      {}) as Prisma.InputJsonValue,
    encryptedCredentials: null,
    credentialFingerprint: null,
    lastTestedAt: existing?.lastTestedAt ?? null,
    lastTestStatus: existing?.lastTestStatus ?? null,
    lastError: null,
    connectedById: null,
    connectedAt: null,
  });

  await createAuditLog({
    userId: actorId(currentUser),
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "INTEGRATION_DISCONNECTED",
    entityType: "Integration",
    entityId: row.id,
    newData: { type, status: "DISCONNECTED" },
  });

  return toDetailDto(type, row);
};

export const syncGoogleWorkspaceIntegration = async (params: {
  instituteId: string;
  userId: string;
  email: string | null;
  scopes?: string[];
  connected: boolean;
}) => {
  const { instituteId, userId, email, scopes = [], connected } = params;
  const hasSheetsScope = scopes.some(
    (s) => s.includes("spreadsheets") || s.includes("drive")
  );

  await repo.upsertIntegration(instituteId, "GOOGLE_WORKSPACE", {
    provider: "GOOGLE",
    status: connected ? "CONNECTED" : "DISCONNECTED",
    isEnabled: connected,
    configuration: { email, scopes } as Prisma.InputJsonValue,
    encryptedCredentials: null,
    credentialFingerprint: null,
    lastTestedAt: connected ? new Date() : null,
    lastTestStatus: connected ? "SUCCESS" : null,
    lastError: null,
    connectedById: connected ? userId : null,
    connectedAt: connected ? new Date() : null,
  });

  if (hasSheetsScope || !connected) {
    await repo.upsertIntegration(instituteId, "GOOGLE_SHEETS", {
      provider: "GOOGLE",
      status: connected ? "CONNECTED" : "DISCONNECTED",
      isEnabled: connected,
      configuration: { email, scopes } as Prisma.InputJsonValue,
      encryptedCredentials: null,
      credentialFingerprint: null,
      lastTestedAt: connected ? new Date() : null,
      lastTestStatus: connected ? "SUCCESS" : null,
      lastError: null,
      connectedById: connected ? userId : null,
      connectedAt: connected ? new Date() : null,
    });
  }
};

export const resolveAiCredentials = async (instituteId: string) => {
  const row = await repo.findByInstituteAndType(instituteId, "AI");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const config = (row?.configuration || {}) as { model?: string; baseUrl?: string };
  return {
    apiKey:
      creds.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    model: config.model || process.env.LLM_MODEL || "gpt-4o-mini",
    baseUrl:
      config.baseUrl || process.env.LLM_BASE_URL || "https://api.openai.com/v1",
    isEnabled: row?.isEnabled ?? true,
  };
};

export const resolveWhatsappApiKey = async (
  instituteId: string
): Promise<string> => {
  const row = await repo.findByInstituteAndType(instituteId, "WHATSAPP");
  const creds = decryptCredentials(row?.encryptedCredentials);
  return creds.apiKey || env.AISENSY_API_KEY || "";
};

export const resolveEmailSmtpConfig = async (instituteId: string) => {
  const row = await repo.findByInstituteAndType(instituteId, "EMAIL");
  const creds = decryptCredentials(row?.encryptedCredentials);
  const config = (row?.configuration || {}) as {
    host?: string;
    port?: number;
    username?: string;
    fromName?: string;
    fromEmail?: string;
    secure?: boolean;
  };
  return {
    host: config.host || "",
    port: config.port || 587,
    username: config.username || "",
    password: creds.password || "",
    fromName: config.fromName || "",
    fromEmail: config.fromEmail || "",
    secure: Boolean(config.secure),
    isEnabled: row?.isEnabled ?? true,
  };
};
