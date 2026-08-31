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
  EMPLOYEE: "FAC-{YEAR}-{SEQ:4}",
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
        let seriesRecord = await findActiveNumberingSeries(instituteId, normalizedTarget, tx);

        // If no series configured yet, auto-create a standard series record based on current DB count
        if (!seriesRecord) {
          let initialCount = 0;
          if (normalizedTarget === "ADMISSION") {
            initialCount = await tx.admission.count({ where: { instituteId } });
          } else if (normalizedTarget === "STUDENT") {
            initialCount = await tx.student.count({ where: { instituteId } });
          } else if (normalizedTarget === "APPLICATION") {
            initialCount = await tx.application.count({ where: { instituteId } });
          } else if (normalizedTarget === "ENQUIRY") {
            initialCount = await tx.lead.count({ where: { instituteId } });
          } else if (normalizedTarget === "RECEIPT") {
            initialCount = await tx.payment.count({ where: { instituteId } });
          }

          const defaultPattern = DEFAULT_PATTERNS[normalizedTarget] || "AADYA/{YEAR}/{SEQ:4}";
          const newSeriesData: NumberingSeriesData = {
            target: normalizedTarget,
            pattern: defaultPattern,
            startNumber: 1,
            currentSequence: initialCount,
            resetFrequency: "YEARLY",
            lastResetPeriod: getCurrentPeriodKey("YEARLY"),
          };

          try {
            seriesRecord = await tx.masterRecord.create({
              data: {
                instituteId,
                entityType: "numberingseries",
                name: `${normalizedTarget} Numbering Series`,
                code: normalizedTarget,
                status: "ACTIVE",
                data: newSeriesData as unknown as Prisma.InputJsonValue,
              },
            });
          } catch {
            // If another transaction created it concurrently, re-fetch
            seriesRecord = await findActiveNumberingSeries(instituteId, normalizedTarget, tx);
          }
        }

        const seriesData = seriesRecord ? parseSeriesData(seriesRecord) : null;
        const pattern = seriesData?.pattern || DEFAULT_PATTERNS[normalizedTarget] || "AADYA/{YEAR}/{SEQ:4}";
        const resetFrequency = seriesData?.resetFrequency || "YEARLY";
        const currentPeriodKey = getCurrentPeriodKey(resetFrequency);
        const shouldReset =
          resetFrequency !== "NEVER" && seriesData?.lastResetPeriod !== currentPeriodKey;

        const startNum = Number(seriesData?.startNumber) || 1;
        const currentSeq = Number(seriesData?.currentSequence) || 0;
        let nextSequence = shouldReset ? startNum : currentSeq + 1;

        let generatedNumber = applyPattern(pattern, nextSequence, context);

        // Verification & Collision Prevention Loop
        if (normalizedTarget === "ADMISSION") {
          let attempts = 0;
          while (
            (await tx.admission.findFirst({ where: { instituteId, admissionNo: generatedNumber } })) &&
            attempts < 500
          ) {
            nextSequence++;
            attempts++;
            generatedNumber = applyPattern(pattern, nextSequence, context);
          }
        } else if (normalizedTarget === "STUDENT") {
          let attempts = 0;
          while (
            (await tx.student.findFirst({ where: { instituteId, studentCode: generatedNumber } })) &&
            attempts < 500
          ) {
            nextSequence++;
            attempts++;
            generatedNumber = applyPattern(pattern, nextSequence, context);
          }
        }

        if (seriesRecord) {
          const updatedData: NumberingSeriesData = {
            ...(seriesData || {}),
            target: normalizedTarget,
            pattern,
            startNumber: startNum,
            currentSequence: nextSequence,
            resetFrequency,
            lastResetPeriod: currentPeriodKey,
          };

          await tx.masterRecord.update({
            where: { id: seriesRecord.id },
            data: { data: updatedData as unknown as Prisma.InputJsonValue },
          });
        }

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
      const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
      return applyPattern(DEFAULT_PATTERNS[normalizedTarget] || "{SEQ:6}", fallbackSeq, context);
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
