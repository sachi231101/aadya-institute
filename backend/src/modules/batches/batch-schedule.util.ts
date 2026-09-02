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

export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  while (cursor <= endDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

