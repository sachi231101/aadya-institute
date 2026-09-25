import { AppError } from "../middlewares/error.middleware";

/** Institute wall-clock timezone for class hosting windows. */
export const INSTITUTE_TZ = "Asia/Kolkata";

export type SessionHostPhase = "before" | "during" | "after";

/** Calendar date in Asia/Kolkata as YYYY-MM-DD. */
export const istTodayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: INSTITUTE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/**
 * Normalize a stored scheduledDate (UTC-noon Date or ISO/date string) to YYYY-MM-DD.
 */
export const toSessionDateKey = (value: Date | string): string => {
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

/**
 * Parse start/end times: `9:00 AM`, `09:00 AM`, `09:00`, `09:00:00`.
 * Returns minutes from midnight, or null if unparseable.
 */
export const parseSessionTimeToMinutes = (timeStr: string): number | null => {
  const trimmed = String(timeStr || "").trim();
  if (!trimmed) return null;

  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null;
    const ap = ampm[4].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    if (h > 23) return null;
    return h * 60 + m;
  }

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  return null;
};

/**
 * UTC Date for an Asia/Kolkata wall-clock instant on dateKey (YYYY-MM-DD).
 * Kolkata has no DST (+05:30 year-round).
 */
export const getSessionInstant = (dateKey: string, timeStr: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const minutes = parseSessionTimeToMinutes(timeStr);
  if (minutes === null) return null;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const d = new Date(`${dateKey}T${hh}:${mm}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Half-open host window: start inclusive, end exclusive.
 * `now >= end` → after (ended).
 */
export const getSessionHostPhase = (params: {
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): SessionHostPhase => {
  const now = params.now ?? new Date();
  const start = getSessionInstant(params.dateKey, params.startTime);
  const end = getSessionInstant(params.dateKey, params.endTime);
  if (!start || !end) return "before";

  const t = now.getTime();
  if (t < start.getTime()) return "before";
  if (t >= end.getTime()) return "after";
  return "during";
};

export const canStartLiveInWindow = (params: {
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): boolean => getSessionHostPhase(params) === "during";

/**
 * Meet join URL may be exposed only while DB status is LIVE and the
 * Asia/Kolkata half-open window is still open. Stuck LIVE after end → false.
 */
export const canExposeMeetingJoinUrl = (params: {
  sessionStatus?: string | null;
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): boolean => {
  const status = String(params.sessionStatus || "").toUpperCase();
  if (status !== "LIVE" && status !== "ONGOING") return false;
  return getSessionHostPhase(params) === "during";
};

/**
 * Enforce Host Class / start-live rules.
 * Rejects COMPLETED/CANCELLED and any call outside the scheduled window.
 */
export const assertCanStartLiveSession = (params: {
  sessionStatus?: string | null;
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): void => {
  const status = String(params.sessionStatus || "").toUpperCase();
  if (status === "COMPLETED") {
    throw new AppError(
      "Cannot start a completed class session",
      400,
      "CLASS_SESSION_NOT_STARTABLE"
    );
  }
  if (status === "CANCELLED") {
    throw new AppError(
      "Cannot start a cancelled class session",
      400,
      "CLASS_SESSION_NOT_STARTABLE"
    );
  }

  const phase = getSessionHostPhase(params);
  if (phase === "before") {
    throw new AppError(
      "Class can only be hosted during its scheduled time window",
      400,
      "CLASS_SESSION_BEFORE_WINDOW"
    );
  }
  if (phase === "after") {
    throw new AppError(
      "This class's scheduled time window has ended",
      400,
      "CLASS_SESSION_AFTER_WINDOW"
    );
  }
};

/**
 * Enforce faculty session attendance marking within the same half-open window as Host.
 * Admin / center-manager corrections are gated by the caller (do not call for non-faculty).
 */
export const assertCanMarkSessionAttendance = (params: {
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): void => {
  const phase = getSessionHostPhase(params);
  if (phase === "before") {
    throw new AppError(
      "Attendance can only be marked during the scheduled class time window",
      400,
      "CLASS_SESSION_BEFORE_WINDOW"
    );
  }
  if (phase === "after") {
    throw new AppError(
      "This class's scheduled time window has ended; attendance can no longer be marked",
      400,
      "CLASS_SESSION_AFTER_WINDOW"
    );
  }
};
