import { prisma } from "../../config/database";
import { env } from "../../config/env";

const DAY_MS = 24 * 60 * 60 * 1000;

const asPositiveDays = (value: unknown): number | null => {
  const days = typeof value === "number" ? value : Number(value);
  return Number.isFinite(days) && days > 0 ? days : null;
};

const retentionDaysFromConfiguration = (
  configuration: unknown
): number | null => {
  if (
    !configuration ||
    typeof configuration !== "object" ||
    Array.isArray(configuration)
  ) {
    return null;
  }

  return asPositiveDays(
    (configuration as Record<string, unknown>).recordingRetentionDays
  );
};

export const getRecordingRetentionMs = async (
  instituteId: string
): Promise<number> => {
  const integration = await prisma.integration.findUnique({
    where: {
      instituteId_type: {
        instituteId,
        type: "GOOGLE_WORKSPACE",
      },
    },
    select: { configuration: true },
  });

  const configuredDays = retentionDaysFromConfiguration(
    integration?.configuration
  );

  return (configuredDays ?? env.RECORDING_RETENTION_DAYS) * DAY_MS;
};

/**
 * Widest effective retention across env default + institute overrides.
 * Used by scheduled sync scans so per-institute longer retention is not missed.
 */
export const getMaxRecordingRetentionMs = async (): Promise<number> => {
  const integrations = await prisma.integration.findMany({
    where: { type: "GOOGLE_WORKSPACE" },
    select: { configuration: true },
  });

  let maxDays = env.RECORDING_RETENTION_DAYS;
  for (const integration of integrations) {
    const configuredDays = retentionDaysFromConfiguration(
      integration.configuration
    );
    if (configuredDays && configuredDays > maxDays) {
      maxDays = configuredDays;
    }
  }

  return maxDays * DAY_MS;
};
