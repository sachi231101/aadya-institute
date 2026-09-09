import { getRedis, isRedisAvailable } from "../../config/redis";
import { logger } from "../../config/logger";

const DEFAULT_LIMIT = Number(process.env.AI_CALLING_INSTITUTE_RATE_LIMIT || 20);
const DEFAULT_WINDOW_SEC = Number(process.env.AI_CALLING_INSTITUTE_RATE_WINDOW_SEC || 60);

/**
 * Per-institute dial rate limit via Redis.
 * Returns true when the call is allowed. If Redis is unavailable, allows the call.
 */
export async function tryAcquireInstituteDialSlot(
  instituteId: string,
  limit = DEFAULT_LIMIT,
  windowSec = DEFAULT_WINDOW_SEC
): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedis();
  if (!redis || !isRedisAvailable()) {
    return { allowed: true, count: 0 };
  }

  const key = `aadya:ai-calling:rate:${instituteId}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }
    return { allowed: count <= limit, count };
  } catch (err) {
    logger.debug({ err, instituteId }, "[ai-calling] rate limit check failed — allowing");
    return { allowed: true, count: 0 };
  }
}

/** Parse HH:MM in institute timezone; returns whether now is inside calling window. */
export function isWithinCallingHours(params: {
  now?: Date;
  timezone: string;
  callingHoursStart: string | null;
  callingHoursEnd: string | null;
  callingDays: number[] | null;
}): boolean {
  const {
    timezone,
    callingHoursStart,
    callingHoursEnd,
    callingDays,
  } = params;
  const now = params.now ?? new Date();

  // No hours configured → always allow
  if (!callingHoursStart || !callingHoursEnd) {
    if (!callingDays || callingDays.length === 0) return true;
  }

  const parts = getZonedParts(now, timezone);
  if (callingDays && callingDays.length > 0 && !callingDays.includes(parts.weekday)) {
    return false;
  }

  if (!callingHoursStart || !callingHoursEnd) return true;

  const nowMinutes = parts.hour * 60 + parts.minute;
  const startMinutes = parseHhMm(callingHoursStart);
  const endMinutes = parseHhMm(callingHoursEnd);
  if (startMinutes === null || endMinutes === null) return true;

  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight window (e.g. 22:00–06:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/** Milliseconds until the next allowed calling window start (capped). */
export function msUntilNextCallingWindow(params: {
  now?: Date;
  timezone: string;
  callingHoursStart: string | null;
  callingHoursEnd: string | null;
  callingDays: number[] | null;
}): number {
  const now = params.now ?? new Date();
  if (isWithinCallingHours({ ...params, now })) return 0;

  const start = params.callingHoursStart || "09:00";
  const startMinutes = parseHhMm(start) ?? 9 * 60;

  // Probe next 7 days for first allowed slot
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const parts = getZonedParts(candidate, params.timezone);
    if (params.callingDays?.length && !params.callingDays.includes(parts.weekday)) {
      continue;
    }
    const candidateLocal = zonedDateAt(candidate, params.timezone, startMinutes);
    if (candidateLocal.getTime() > now.getTime()) {
      return Math.min(candidateLocal.getTime() - now.getTime(), 24 * 60 * 60 * 1000);
    }
  }

  return 60 * 60 * 1000; // fallback 1h
}

function parseHhMm(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function getZonedParts(date: Date, timeZone: string): {
  hour: number;
  minute: number;
  weekday: number;
} {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const parts = fmt.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return { hour: hour === 24 ? 0 : hour, minute, weekday: map[weekdayName] ?? 1 };
  } catch {
    return {
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      weekday: date.getUTCDay(),
    };
  }
}

function zonedDateAt(base: Date, timeZone: string, minutesFromMidnight: number): Date {
  // Approximate: take current zoned Y-M-D and set time; convert back via offset estimate
  try {
    const dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const ymd = dateFmt.format(base); // YYYY-MM-DD
    const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
    const mm = String(minutesFromMidnight % 60).padStart(2, "0");
    // Treat as local wall time in timezone by computing offset
    const asUtc = new Date(`${ymd}T${hh}:${mm}:00.000Z`);
    const localParts = getZonedParts(asUtc, timeZone);
    const localMinutes = localParts.hour * 60 + localParts.minute;
    const delta = (localMinutes - minutesFromMidnight) * 60 * 1000;
    return new Date(asUtc.getTime() - delta);
  } catch {
    return new Date(base.getTime() + 60 * 60 * 1000);
  }
}

/** Calendar date (UTC midnight) for usage counters, keyed by institute local date. */
export function usageDateKey(now: Date, timeZone: string): Date {
  try {
    const dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const ymd = dateFmt.format(now);
    return new Date(`${ymd}T00:00:00.000Z`);
  } catch {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
