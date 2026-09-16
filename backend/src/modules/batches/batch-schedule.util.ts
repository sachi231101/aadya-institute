const PATTERN_DAYS: Record<string, number[]> = {
  MWF: [1, 3, 5],
  TTS: [2, 4, 6],
  WEEKEND: [0, 6],
  CUSTOM: [],
};

export function getDaysForPattern(pattern?: string): number[] {
  if (!pattern) return PATTERN_DAYS.MWF;
  return PATTERN_DAYS[pattern.toUpperCase()] ?? PATTERN_DAYS.MWF;
}

export function parseTimeSlot(timeSlot?: string): { startTime: string; endTime: string } {
  const fallback = { startTime: "10:00 AM", endTime: "12:00 PM" };
  if (!timeSlot) return fallback;

  const parts = timeSlot.split(/\s*[-–]\s*/);
  if (parts.length >= 2) {
    return {
      startTime: parts[0].trim(),
      endTime: parts[1].trim(),
    };
  }
  return fallback;
}

export function buildDefaultSchedules(
  pattern: string,
  timeSlot: string,
  effectiveFrom: Date
): Array<{ dayOfWeek: number; startTime: string; endTime: string; effectiveFrom: Date }> {
  const days = getDaysForPattern(pattern);
  const { startTime, endTime } = parseTimeSlot(timeSlot);
  return days.map((dayOfWeek) => ({
    dayOfWeek,
    startTime,
    endTime,
    effectiveFrom,
  }));
}

/** Normalize to YYYY-MM-DD using UTC calendar parts (matches ClassSession UTC-noon storage). */
export function formatDateKey(date: Date | string): string {
  if (typeof date === "string") {
    const match = date.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
    }
    return date.slice(0, 10);
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Store/compare calendar days at UTC noon so IST/local never shifts the day. */
export function utcNoonFromDateKey(dateKey: string): Date {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(`${dateKey}T12:00:00.000Z`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
  );
}

export function dayOfWeekFromDateKey(dateKey: string): number {
  return utcNoonFromDateKey(dateKey).getUTCDay();
}

export function eachDateKeyInRange(start: Date | string, end: Date | string): string[] {
  const startKey = formatDateKey(start);
  const endKey = formatDateKey(end);
  const keys: string[] = [];
  let cursor = utcNoonFromDateKey(startKey);
  const endDt = utcNoonFromDateKey(endKey);
  while (cursor.getTime() <= endDt.getTime()) {
    keys.push(formatDateKey(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

/** @deprecated Prefer eachDateKeyInRange + utcNoonFromDateKey for session generation. */
export function eachDateInRange(start: Date, end: Date): Date[] {
  return eachDateKeyInRange(start, end).map((key) => utcNoonFromDateKey(key));
}

/** Infer MWF/TTS/WEEKEND/CUSTOM from a set of dayOfWeek values (0=Sun .. 6=Sat). */
export function derivePatternFromDays(days: number[]): "MWF" | "TTS" | "WEEKEND" | "CUSTOM" {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length === 3 && unique[0] === 1 && unique[1] === 3 && unique[2] === 5) return "MWF";
  if (unique.length === 3 && unique[0] === 2 && unique[1] === 4 && unique[2] === 6) return "TTS";
  if (unique.length === 2 && unique[0] === 2 && unique[1] === 4) return "TTS";
  if (unique.every((d) => d === 0 || d === 6) && unique.length > 0) return "WEEKEND";
  return "CUSTOM";
}
