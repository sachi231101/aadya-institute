/** Shared timetable period slots — driven by Time Slot Master (`timeslot`). */

import type { MasterDropdownOption } from "@/hooks/useMasterDropdown";
import {
  buildTimeslotName,
  formatTimeToAmPm,
  parseAmPmToTimeInput,
} from "@/utils/master.utils";

export type TimetablePeriodSlot = {
  period: number;
  label: string;
  timeTitle: string;
  subTitle: string;
  start: string;
  end: string;
  timeslotMasterId?: string;
  hour24?: number;
  minute?: number;
  isBreak?: boolean;
  isLunch?: boolean;
};

/** Legacy static columns — only used as last-resort mid-session fallback when masters fail after slots already rendered. Prefer master-built slots. */
export const TIME_SLOT_COLUMNS: TimetablePeriodSlot[] = [
  { period: 1, label: "09:00 - 10:00 AM", timeTitle: "09:00 – 10:00", subTitle: "AM", start: "09:00 AM", end: "10:00 AM", hour24: 9, minute: 0 },
  { period: 2, label: "10:00 - 11:00 AM", timeTitle: "10:00 – 11:00", subTitle: "AM", start: "10:00 AM", end: "11:00 AM", hour24: 10, minute: 0 },
  { period: 3, label: "11:00 - 12:00 PM", timeTitle: "11:00 – 12:00", subTitle: "PM", start: "11:00 AM", end: "12:00 PM", hour24: 11, minute: 0 },
  { period: 4, label: "12:00 - 01:00 PM", timeTitle: "12:00 – 01:00", subTitle: "PM", start: "12:00 PM", end: "01:00 PM", hour24: 12, minute: 0 },
  { period: 5, label: "01:00 - 02:00 PM", timeTitle: "01:00 – 02:00", subTitle: "PM", start: "01:00 PM", end: "02:00 PM", hour24: 13, minute: 0 },
  { period: 6, label: "02:00 - 03:00 PM", timeTitle: "02:00 – 03:00", subTitle: "PM", start: "02:00 PM", end: "03:00 PM", hour24: 14, minute: 0 },
  { period: 7, label: "03:00 - 04:00 PM", timeTitle: "03:00 – 04:00", subTitle: "PM", start: "03:00 PM", end: "04:00 PM", hour24: 15, minute: 0 },
  { period: 8, label: "04:00 - 05:00 PM", timeTitle: "04:00 – 05:00", subTitle: "PM", start: "04:00 PM", end: "05:00 PM", hour24: 16, minute: 0 },
];

/** @deprecated Prefer bookableSlots from useTimetableSlotColumns — all master slots are bookable. */
export const BOOKABLE_TIME_SLOTS = TIME_SLOT_COLUMNS;

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

export const parseTimeToMinutes = (time: string): number | null => {
  const hhmm = parseAmPmToTimeInput(time);
  if (!hhmm) {
    const hour = parseTimeToHour24(time);
    return hour === null ? null : hour * 60;
  }
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const slotSortKey = (startRaw: string): number => {
  const mins = parseTimeToMinutes(startRaw);
  return mins ?? Number.MAX_SAFE_INTEGER;
};

/**
 * Build timetable columns from active Time Slot masters.
 * Every configured master becomes a column (no invented break/lunch).
 */
export const buildTimetableSlotsFromMasters = (
  options: MasterDropdownOption[]
): TimetablePeriodSlot[] => {
  const prepared = options
    .map((opt) => {
      const startRaw =
        typeof opt.data?.startTime === "string" ? opt.data.startTime : undefined;
      const endRaw =
        typeof opt.data?.endTime === "string" ? opt.data.endTime : undefined;
      const start = startRaw ? formatTimeToAmPm(startRaw) : "";
      const end = endRaw ? formatTimeToAmPm(endRaw) : "";
      const label = buildTimeslotName(startRaw, endRaw) || opt.label;
      if (!start || !end) return null;
      const hhmm = parseAmPmToTimeInput(start);
      const [hStr, mStr] = (hhmm || "").split(":");
      const hour24 = hStr ? Number(hStr) : parseTimeToHour24(start);
      const minute = mStr ? Number(mStr) : 0;
      const timeTitle = `${start.replace(/\s*(AM|PM)$/i, "").trim()} – ${end.replace(/\s*(AM|PM)$/i, "").trim()}`;
      const subTitle = (end.match(/\s*(AM|PM)$/i)?.[1] || start.match(/\s*(AM|PM)$/i)?.[1] || "").toUpperCase();
      return {
        label,
        timeTitle,
        subTitle,
        start,
        end,
        timeslotMasterId: opt.value,
        hour24: hour24 ?? undefined,
        minute: Number.isFinite(minute) ? minute : 0,
        sortKey: slotSortKey(start),
        sortOrder:
          typeof opt.data?.sortOrder === "number"
            ? opt.data.sortOrder
            : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.sortKey - b.sortKey || a.label.localeCompare(b.label));

  return prepared.map((slot, index) => ({
    period: index + 1,
    label: slot.label,
    timeTitle: slot.timeTitle,
    subTitle: slot.subTitle,
    start: slot.start,
    end: slot.end,
    timeslotMasterId: slot.timeslotMasterId,
    hour24: slot.hour24,
    minute: slot.minute,
  }));
};

/** Map a start time to a timetable period using the provided slot list. */
export const periodFromStartTime = (
  startTime: string,
  slots: TimetablePeriodSlot[] = TIME_SLOT_COLUMNS
): number | null => {
  if (!slots.length) return null;
  const startMins = parseTimeToMinutes(startTime);
  if (startMins === null) return null;

  const normalized = startTime.trim().toLowerCase();
  const exact = slots.find((c) => c.start.trim().toLowerCase() === normalized);
  if (exact) return exact.period;

  let best: number | null = null;
  let bestDist = Infinity;
  for (const col of slots) {
    const colMins = parseTimeToMinutes(col.start);
    if (colMins === null) continue;
    const dist = Math.abs(colMins - startMins);
    if (dist < bestDist) {
      bestDist = dist;
      best = col.period;
    }
  }
  // Only snap if within 30 minutes of a configured slot start
  if (best !== null && bestDist <= 30) return best;
  return null;
};

export const periodToTimes = (
  period: number,
  slots: TimetablePeriodSlot[] = TIME_SLOT_COLUMNS
): { start: string; end: string; timeslotMasterId?: string } => {
  const col = slots.find((c) => c.period === period);
  return {
    start: col?.start || "09:00 AM",
    end: col?.end || "10:00 AM",
    timeslotMasterId: col?.timeslotMasterId,
  };
};

export const findPeriodByTimes = (
  startTime: string,
  endTime: string,
  slots: TimetablePeriodSlot[] = TIME_SLOT_COLUMNS
): number | null => {
  const exact = slots.find(
    (c) =>
      c.start.toLowerCase() === startTime.trim().toLowerCase() &&
      c.end.toLowerCase() === endTime.trim().toLowerCase()
  );
  if (exact) return exact.period;

  const byMasterStart = periodFromStartTime(startTime, slots);
  return byMasterStart;
};

export const findSlotByMasterId = (
  timeslotMasterId: string | null | undefined,
  slots: TimetablePeriodSlot[]
): TimetablePeriodSlot | null => {
  if (!timeslotMasterId) return null;
  return slots.find((s) => s.timeslotMasterId === timeslotMasterId) ?? null;
};

/** How many consecutive master slots a session spans (min 1). */
export const spanSlotsForSession = (
  startTime: string,
  endTime: string,
  slots: TimetablePeriodSlot[],
  startPeriod?: number | null
): number => {
  if (!slots.length) return 1;
  const startIdx =
    (startPeriod ?? periodFromStartTime(startTime, slots) ?? 1) - 1;
  const endMins = parseTimeToMinutes(endTime);
  if (endMins === null) return 1;

  let span = 1;
  for (let i = startIdx + 1; i < slots.length; i++) {
    const slotStart = parseTimeToMinutes(slots[i].start);
    if (slotStart === null) break;
    if (slotStart < endMins) span += 1;
    else break;
  }
  return Math.max(1, span);
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

/** Normalize master holiday `data.date` (or similar) to YYYY-MM-DD for matching. */
export const toHolidayDateKey = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
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
