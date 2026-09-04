/** Shared timetable period slots — used by Timetable + Classes create forms. */

export type TimetablePeriodSlot = {
  period: number;
  label: string;
  timeTitle: string;
  subTitle: string;
  start: string;
  end: string;
  isBreak?: boolean;
  isLunch?: boolean;
};

export const TIME_SLOT_COLUMNS: TimetablePeriodSlot[] = [
  { period: 1, label: "09:00 - 10:00 AM", timeTitle: "09:00 – 10:00", subTitle: "AM", start: "09:00 AM", end: "10:00 AM" },
  { period: 2, label: "10:00 - 11:00 AM", timeTitle: "10:00 – 11:00", subTitle: "AM", start: "10:00 AM", end: "11:00 AM" },
  { period: 3, label: "11:00 - 12:00 PM", timeTitle: "11:00 – 12:00", subTitle: "PM", start: "11:00 AM", end: "12:00 PM" },
  { period: 4, label: "12:00 - 01:00 PM", timeTitle: "12:00 – 01:00", subTitle: "PM", start: "12:00 PM", end: "01:00 PM", isBreak: true },
  { period: 5, label: "01:00 - 02:00 PM", timeTitle: "01:00 – 02:00", subTitle: "PM", start: "01:00 PM", end: "02:00 PM", isLunch: true },
  { period: 6, label: "02:00 - 03:00 PM", timeTitle: "02:00 – 03:00", subTitle: "PM", start: "02:00 PM", end: "03:00 PM" },
  { period: 7, label: "03:00 - 04:00 PM", timeTitle: "03:00 – 04:00", subTitle: "PM", start: "03:00 PM", end: "04:00 PM" },
  { period: 8, label: "04:00 - 05:00 PM", timeTitle: "04:00 – 05:00", subTitle: "PM", start: "04:00 PM", end: "05:00 PM" },
];

/** Bookable periods only (excludes break / lunch). */
export const BOOKABLE_TIME_SLOTS = TIME_SLOT_COLUMNS.filter((s) => !s.isBreak && !s.isLunch);

export const parseTimeToHour24 = (time: string): number | null => {
  const trimmed = time.trim();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h;
  }
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) return parseInt(hhmm[1], 10);
  return null;
};

/** Map a start time to a timetable period; snaps to nearest bookable slot if exact hour missing. */
export const periodFromStartTime = (startTime: string): number | null => {
  const hour = parseTimeToHour24(startTime);
  if (hour === null) return null;

  const hourToPeriod: Record<number, number> = {
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 6,
    15: 7,
    16: 8,
  };
  if (hourToPeriod[hour]) return hourToPeriod[hour];

  let best: number | null = null;
  let bestDist = Infinity;
  for (const col of BOOKABLE_TIME_SLOTS) {
    const colHour = parseTimeToHour24(col.start);
    if (colHour === null) continue;
    const dist = Math.abs(colHour - hour);
    if (dist < bestDist) {
      bestDist = dist;
      best = col.period;
    }
  }
  return best;
};

export const periodToTimes = (period: number): { start: string; end: string } => {
  const col = TIME_SLOT_COLUMNS.find((c) => c.period === period);
  return { start: col?.start || "09:00 AM", end: col?.end || "10:00 AM" };
};

export const findPeriodByTimes = (startTime: string, endTime: string): number | null => {
  const exact = TIME_SLOT_COLUMNS.find(
    (c) =>
      c.start.toLowerCase() === startTime.trim().toLowerCase() &&
      c.end.toLowerCase() === endTime.trim().toLowerCase()
  );
  if (exact) return exact.period;
  return periodFromStartTime(startTime);
};

/** Calendar date helpers — avoid local/UTC Date shifting for schedule keys. */

export const toDateKey = (value: string | Date): string => {
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
    }
    return value.slice(0, 10);
  }
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
};

export const localTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

export const formatDateKeyLabel = (dateKey: string, options?: Intl.DateTimeFormatOptions): string => {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  return dt.toLocaleDateString("en-IN", {
    timeZone: "UTC",
    ...(options || { day: "numeric", month: "short" }),
  });
};

/** Monday–Sunday range for weekOffset (0 = current week), using local "today". */
export const getWeekRangeFromOffset = (weekOffset: number) => {
  const todayKey = localTodayKey();
  const [y, m, d] = todayKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = utcNoon.getUTCDay(); // 0 Sun … 6 Sat
  const daysSinceMonday = (jsDay + 6) % 7;
  const mondayKey = addDaysToDateKey(todayKey, -daysSinceMonday + weekOffset * 7);
  const sundayKey = addDaysToDateKey(mondayKey, 6);
  const startLabel = formatDateKeyLabel(mondayKey);
  const endLabel = formatDateKeyLabel(sundayKey, { day: "numeric", month: "short", year: "numeric" });
  return {
    from: mondayKey,
    to: sundayKey,
    mondayKey,
    sundayKey,
    label: `${startLabel} – ${endLabel}`,
  };
};
