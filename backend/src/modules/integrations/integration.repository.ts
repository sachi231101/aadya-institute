import { Prisma, type IntegrationType } from "@prisma/client";
import { prisma } from "../../config/database";

export const findByInstituteAndType = (
  instituteId: string,
  type: IntegrationType
) =>
  prisma.integration.findUnique({
    where: { instituteId_type: { instituteId, type } },
  });

export const findAllByInstitute = (instituteId: string) =>
  prisma.integration.findMany({
    where: { instituteId },
    orderBy: { type: "asc" },
  });

export type UpsertIntegrationData = {
  provider: string;
  status: "NOT_CONFIGURED" | "CONFIGURED" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  isEnabled?: boolean;
  configuration?: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
  encryptedCredentials?: string | null;
  credentialFingerprint?: string | null;
  lastTestedAt?: Date | null;
  lastTestStatus?: "SUCCESS" | "FAILED" | "PENDING" | null;
  lastError?: string | null;
  connectedById?: string | null;
  connectedAt?: Date | null;
};

export const upsertIntegration = (
  instituteId: string,
  type: IntegrationType,
  data: UpsertIntegrationData
) => {
  const configValue =
    data.configuration === null
      ? Prisma.JsonNull
      : data.configuration === undefined
        ? undefined
        : data.configuration;

  return prisma.integration.upsert({
    where: { instituteId_type: { instituteId, type } },
    create: {
      instituteId,
      type,
      provider: data.provider,
      status: data.status,
      isEnabled: data.isEnabled ?? true,
      configuration: configValue === Prisma.JsonNull ? undefined : configValue,
      encryptedCredentials: data.encryptedCredentials ?? undefined,
      credentialFingerprint: data.credentialFingerprint ?? undefined,
      lastTestedAt: data.lastTestedAt ?? undefined,
      lastTestStatus: data.lastTestStatus ?? undefined,
      lastError: data.lastError ?? undefined,
      connectedById: data.connectedById ?? undefined,
      connectedAt: data.connectedAt ?? undefined,
    },
    update: {
      provider: data.provider,
      status: data.status,
      ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
      ...(configValue !== undefined ? { configuration: configValue } : {}),
      ...(data.encryptedCredentials !== undefined
        ? { encryptedCredentials: data.encryptedCredentials }
        : {}),
      ...(data.credentialFingerprint !== undefined
        ? { credentialFingerprint: data.credentialFingerprint }
        : {}),
      ...(data.lastTestedAt !== undefined ? { lastTestedAt: data.lastTestedAt } : {}),
      ...(data.lastTestStatus !== undefined
        ? { lastTestStatus: data.lastTestStatus }
        : {}),
      ...(data.lastError !== undefined ? { lastError: data.lastError } : {}),
      ...(data.connectedById !== undefined
        ? { connectedById: data.connectedById }
        : {}),
      ...(data.connectedAt !== undefined ? { connectedAt: data.connectedAt } : {}),
    },
  });
};

export const updateIntegrationFields = (
  id: string,
  data: Prisma.IntegrationUpdateInput
) => prisma.integration.update({ where: { id }, data });
