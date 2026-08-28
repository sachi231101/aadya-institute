/**
 * Client-side numbering pattern preview — mirrors backend SequenceService.applyPattern.
 * Used for unsaved form previews in Master Setup; live previews use the API.
 */

export const DEFAULT_NUMBERING_PATTERNS: Record<string, string> = {
  ADMISSION: "AADYA/{YEAR}/{SEQ:4}",
  RECEIPT: "RCP/{YEAR}/{SEQ:4}",
  STUDENT: "AAD-{YEAR}-{SEQ:4}",
  ENQUIRY: "ENQ-{YEAR}-{SEQ:4}",
  APPLICATION: "APP-{YEAR}-{SEQ:4}",
};

export interface NumberingPreviewContext {
  branchCode?: string;
  courseCode?: string;
}

export const computePatternPreview = (
  pattern: string | undefined,
  sequence: number,
  context: NumberingPreviewContext = {}
): string => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const yy = year.slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const branch = context.branchCode || "HQ";
  const course = context.courseCode || "COURSE";

  let result = (pattern || "{SEQ:4}")
    .replace(/\{YEAR\}/gi, year)
    .replace(/\{YY\}/gi, yy)
    .replace(/\{MONTH\}/gi, month)
    .replace(/\{BRANCH\}/gi, branch)
    .replace(/\{COURSE\}/gi, course);

  result = result.replace(/\{SEQ:(\d+)\}/gi, (_match, digits) =>
    sequence.toString().padStart(parseInt(digits, 10), "0")
  );
  result = result.replace(/\{SEQ\}/gi, sequence.toString().padStart(4, "0"));

  return result;
};

export const getNextSequenceForPreview = (
  currentSequence: number | undefined,
  startNumber: number | undefined,
  isNewRecord: boolean
): number => {
  if (isNewRecord) {
    return Number(startNumber) || 1;
  }
  return (Number(currentSequence) || 0) + 1;
};

export const getDefaultPatternForTarget = (target?: string): string => {
  const normalized = (target || "ADMISSION").toUpperCase();
  return DEFAULT_NUMBERING_PATTERNS[normalized] || "{SEQ:4}";
};
