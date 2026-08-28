/**
 * Centralized Numbering Series Engine for Aadya Institute.
 *
 * Reads numbering configuration from MasterRecord (entityType = "numberingseries")
 * and atomically increments a counter stored in the record's `data` JSON column.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

export interface NumberingSeriesData {
  target: string;
  pattern: string;
  startNumber: number;
  currentSequence: number;
  resetFrequency: "YEARLY" | "MONTHLY" | "NEVER";
  lastResetPeriod?: string;
}

export interface SequenceContext {
  branchCode?: string;
  courseCode?: string;
}

const DEFAULT_PATTERNS: Record<string, string> = {
  ADMISSION: "AADYA/{YEAR}/{SEQ:4}",
  RECEIPT: "RCP/{YEAR}/{SEQ:4}",
  STUDENT: "AAD-{YEAR}-{SEQ:4}",
  ENQUIRY: "ENQ-{YEAR}-{SEQ:4}",
  APPLICATION: "APP-{YEAR}-{SEQ:4}",
};

function applyPattern(
  pattern: string,
  sequence: number,
  context: SequenceContext
): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const yy = year.slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const branch = context.branchCode || "HQ";

  let result = pattern
    .replace(/\{YEAR\}/gi, year)
    .replace(/\{YY\}/gi, yy)
    .replace(/\{MONTH\}/gi, month)
    .replace(/\{BRANCH\}/gi, branch);

  if (context.courseCode) {
    result = result.replace(/\{COURSE\}/gi, context.courseCode);
  }

  result = result.replace(/\{SEQ:(\d+)\}/gi, (_match, digits) =>
    sequence.toString().padStart(parseInt(digits, 10), "0")
  );
  result = result.replace(/\{SEQ\}/gi, sequence.toString().padStart(4, "0"));

  return result;
}

function getCurrentPeriodKey(resetFrequency: string): string {
  const now = new Date();
  if (resetFrequency === "MONTHLY") {
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  }
  return now.getFullYear().toString();
}

function fallbackPreview(
  target: string,
  context: SequenceContext = {}
): { preview: string; currentSequence: number; nextSequence: number } {
  const normalizedTarget = target.toUpperCase();
  const pattern = DEFAULT_PATTERNS[normalizedTarget] || "{SEQ:6}";
  const nextSequence = 1;
  return {
    preview: applyPattern(pattern, nextSequence, context),
    currentSequence: 0,
    nextSequence,
  };
}

function resolveNextSequence(seriesData: NumberingSeriesData): number {
  const resetFrequency = seriesData.resetFrequency || "YEARLY";
  const currentPeriodKey = getCurrentPeriodKey(resetFrequency);
  const startNum = Number(seriesData.startNumber) || 1;
  const currentSeq = Number(seriesData.currentSequence) || 0;

  if (resetFrequency !== "NEVER" && seriesData.lastResetPeriod !== currentPeriodKey) {
    return startNum;
  }

  return currentSeq + 1;
}

async function findActiveNumberingSeries(
  instituteId: string,
  target: string,
  tx: Prisma.TransactionClient = prisma
) {
  const normalizedTarget = target.toUpperCase();
  const baseWhere = {
    instituteId,
    entityType: "numberingseries",
    status: "ACTIVE" as const,
  };

  const byCode = await tx.masterRecord.findFirst({
    where: { ...baseWhere, code: normalizedTarget },
  });
  if (byCode) return byCode;

  return tx.masterRecord.findFirst({
    where: {
      ...baseWhere,
      data: { path: ["target"], equals: normalizedTarget },
    },
  });
}

function parseSeriesData(record: { data: unknown }): NumberingSeriesData | null {
  if (!record.data || typeof record.data !== "object") return null;
  return record.data as NumberingSeriesData;
}

export const SequenceService = {
  async getNextNumber(
    instituteId: string,
    target: string,
    context: SequenceContext = {}
  ): Promise<string> {
    const normalizedTarget = target.toUpperCase();

    try {
      return await prisma.$transaction(async (tx) => {
        const seriesRecord = await findActiveNumberingSeries(instituteId, normalizedTarget, tx);

        if (!seriesRecord) {
          logger.debug(
            { target: normalizedTarget, instituteId },
            "[SequenceService] No numbering series found, using fallback"
          );
          return fallbackPreview(normalizedTarget, context).preview;
        }

        const seriesData = parseSeriesData(seriesRecord);
        if (!seriesData) {
          return fallbackPreview(normalizedTarget, context).preview;
        }

        const pattern = seriesData.pattern || DEFAULT_PATTERNS[normalizedTarget] || "{SEQ:6}";
        const resetFrequency = seriesData.resetFrequency || "YEARLY";
        const currentPeriodKey = getCurrentPeriodKey(resetFrequency);
        const shouldReset =
          resetFrequency !== "NEVER" && seriesData.lastResetPeriod !== currentPeriodKey;

        const startNum = Number(seriesData.startNumber) || 1;
        const currentSeq = Number(seriesData.currentSequence) || 0;
        const nextSequence = shouldReset ? startNum : currentSeq + 1;

        const updatedData: NumberingSeriesData = {
          ...seriesData,
          target: normalizedTarget,
          startNumber: startNum,
          currentSequence: nextSequence,
          lastResetPeriod: currentPeriodKey,
        };

        await tx.masterRecord.update({
          where: { id: seriesRecord.id },
          data: { data: updatedData as unknown as Prisma.InputJsonValue },
        });

        const generatedNumber = applyPattern(pattern, nextSequence, context);

        logger.info(
          { target: normalizedTarget, sequence: nextSequence, generated: generatedNumber },
          "[SequenceService] Generated number"
        );

        return generatedNumber;
      });
    } catch (error) {
      logger.error(
        { error, target: normalizedTarget, instituteId },
        "[SequenceService] Failed to generate number, using fallback"
      );
      return fallbackPreview(normalizedTarget, context).preview;
    }
  },

  async previewNextNumber(
    instituteId: string,
    target: string,
    context: SequenceContext = {}
  ): Promise<{ preview: string; currentSequence: number; nextSequence: number }> {
    const normalizedTarget = target.toUpperCase();

    const seriesRecord = await findActiveNumberingSeries(instituteId, normalizedTarget);

    if (!seriesRecord) {
      return fallbackPreview(normalizedTarget, context);
    }

    const seriesData = parseSeriesData(seriesRecord);
    if (!seriesData) {
      return fallbackPreview(normalizedTarget, context);
    }

    const pattern = seriesData.pattern || DEFAULT_PATTERNS[normalizedTarget] || "{SEQ:6}";
    const currentSeq = Number(seriesData.currentSequence) || 0;
    const nextSequence = resolveNextSequence(seriesData);
    const preview = applyPattern(pattern, nextSequence, context);

    return {
      preview,
      currentSequence: currentSeq,
      nextSequence,
    };
  },

  /**
   * Returns true when the supplied value matches the next preview (case-insensitive).
   * Used to detect UI preview codes that should still consume the sequence counter.
   */
  async matchesNextPreview(
    instituteId: string,
    target: string,
    value: string,
    context: SequenceContext = {}
  ): Promise<boolean> {
    const preview = await this.previewNextNumber(instituteId, target, context);
    return preview.preview.toUpperCase() === value.trim().toUpperCase();
  },
};
