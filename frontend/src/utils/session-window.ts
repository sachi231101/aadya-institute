/** Institute wall-clock timezone for class hosting windows. */
export const INSTITUTE_TZ = "Asia/Kolkata";

export type SessionHostPhase = "before" | "during" | "after";

export type DisplaySessionStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

/** Calendar date in Asia/Kolkata as YYYY-MM-DD. */
export const istTodayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: INSTITUTE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

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

/** True when Host Class / start-live is allowed for the scheduled window. */
export const canHostClassSession = (params: {
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): boolean => getSessionHostPhase(params) === "during";

/**
 * Display status overlay (does not rewrite DB):
 * - CANCELLED → keep
 * - COMPLETED or phase after → Completed
 * - LIVE and during → LIVE
 * - before / during (not LIVE) → Upcoming
 */
export const resolveDisplaySessionStatus = (params: {
  dbStatus?: string | null;
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): DisplaySessionStatus => {
  const db = String(params.dbStatus || "UPCOMING").toUpperCase();
  if (db === "CANCELLED") return "CANCELLED";

  const phase = getSessionHostPhase(params);
  if (db === "COMPLETED" || phase === "after") return "COMPLETED";
  if ((db === "LIVE" || db === "ONGOING" || db === "LIVE NOW") && phase === "during") {
    return "LIVE";
  }
  return "UPCOMING";
};

/**
 * Student Join Class: only while the Asia/Kolkata window is open and the
 * session is actually LIVE. Stuck DB LIVE after end → false (clock wins).
 */
export const canStudentJoinSession = (params: {
  dbStatus?: string | null;
  dateKey: string;
  startTime: string;
  endTime: string;
  now?: Date;
}): boolean => resolveDisplaySessionStatus(params) === "LIVE";

/** Short reason when Host is disabled. */
export const hostWindowDisabledReason = (phase: SessionHostPhase): string | null => {
  if (phase === "before") return "Host opens at the scheduled start time";
  if (phase === "after") return "Scheduled time window has ended";
  return null;
};

/** Split a display range like `09:00 AM – 10:00 AM` into start/end. */
export const splitTimeRange = (
  range: string
): { startTime: string; endTime: string } | null => {
  const parts = String(range || "").split(/\s*[–—-]\s*/);
  if (parts.length < 2) return null;
  const startTime = parts[0].trim();
  const endTime = parts.slice(1).join("-").trim();
  if (!startTime || !endTime) return null;
  return { startTime, endTime };
};
