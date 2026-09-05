import type { Integration, IntegrationStatus, IntegrationType } from "@prisma/client";
import {
  decryptCredentials,
  maskSecret,
  pickPrimarySecret,
} from "../../utils/integration-credentials.util";
import {
  INTEGRATION_CATALOG,
  type IntegrationCardDto,
  type IntegrationDetailDto,
} from "./integration.types";

const asConfig = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const computeIsConfigured = (row: Integration | null): boolean => {
  if (!row) return false;
  if (row.type === "GOOGLE_WORKSPACE" || row.type === "GOOGLE_SHEETS") {
    return row.status === "CONNECTED" || Boolean(row.configuration);
  }
  return Boolean(row.encryptedCredentials);
};

export const resolveStatus = (row: Integration | null): IntegrationStatus => {
  if (!row) return "NOT_CONFIGURED";
  return row.status;
};

export const toCardDto = (
  type: IntegrationType,
  row: Integration | null
): IntegrationCardDto => {
  const meta = INTEGRATION_CATALOG[type];
  const isConfigured = computeIsConfigured(row);
  let maskedCredential: string | null = null;

  if (row?.encryptedCredentials) {
    const creds = decryptCredentials(row.encryptedCredentials);
    maskedCredential = maskSecret(pickPrimarySecret(creds));
  } else if (row?.credentialFingerprint) {
    maskedCredential = `••••${row.credentialFingerprint}`;
  }

  return {
    type,
    name: meta.name,
    description: meta.description,
    provider: row?.provider ?? meta.defaultProvider,
    status: resolveStatus(row),
    isConfigured,
    isEnabled: row?.isEnabled ?? true,
    maskedCredential,
    lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
    lastTestStatus: row?.lastTestStatus ?? null,
    lastError: row?.lastError ?? null,
  };
};

export const toDetailDto = (
  type: IntegrationType,
  row: Integration | null
): IntegrationDetailDto => {
  const card = toCardDto(type, row);
  return {
    ...card,
    id: row?.id ?? null,
    configuration: asConfig(row?.configuration),
    connectedAt: row?.connectedAt?.toISOString() ?? null,
    connectedById: row?.connectedById ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  };
};
