export type FacultyPunchType = "CHECK_IN" | "CHECK_OUT";
export type FacultyPunchSource = "MANUAL" | "AUTO_GEOFENCE";

export interface FacultyPunchRow {
  id: string;
  facultyId: string;
  date: Date;
  type: FacultyPunchType;
  timeHmm: string;
  punchedAt: Date;
  source: FacultyPunchSource;
  latitude: number | null;
  longitude: number | null;
}

export interface FacultyPunchDto {
  id: string;
  type: FacultyPunchType;
  timeHmm: string;
  punchedAt: string;
  source: FacultyPunchSource;
  latitude: number | null;
  longitude: number | null;
}

export interface FacultyDaySessionSummary {
  punches: FacultyPunchDto[];
  /** Last punch of the day is CHECK_IN. */
  openSession: boolean;
  firstIn: string | null;
  lastOut: string | null;
  /** CHECK_IN-started sessions, including the open one. */
  sessionCount: number;
  /** Completed sessions only. */
  totalMinutes: number;
}

/** Day summary row fields used when a day has no punches (pre-punch data or admin-entered times). */
export interface FacultyDayRowTimes {
  status: string;
  inTime: string | null;
  outTime: string | null;
}

export const hmmToMinutes = (hmm: string): number => {
  const [h, m] = hmm.split(":").map(Number);
  return h * 60 + m;
};

export const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

/** IST wall time (YYYY-MM-DD + HH:mm) → UTC instant. */
export const istWallTimeToDate = (dateKey: string, hmm: string): Date => {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const [h, mi] = hmm.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - 330 * 60 * 1000);
};

export const toPunchDto = (p: FacultyPunchRow): FacultyPunchDto => ({
  id: p.id,
  type: p.type,
  timeHmm: p.timeHmm,
  punchedAt: p.punchedAt.toISOString(),
  source: p.source,
  latitude: p.latitude,
  longitude: p.longitude,
});

const summarizeFromRowTimes = (row: FacultyDayRowTimes | null | undefined): FacultyDaySessionSummary => {
  const inTime = row?.status === "PRESENT" ? row.inTime : null;
  const outTime = row?.status === "PRESENT" ? row.outTime : null;
  const totalMinutes =
    inTime && outTime ? Math.max(0, hmmToMinutes(outTime) - hmmToMinutes(inTime)) : 0;
  return {
    punches: [],
    openSession: Boolean(inTime && !outTime),
    firstIn: inTime,
    lastOut: outTime,
    sessionCount: inTime ? 1 : 0,
    totalMinutes,
  };
};

/**
 * Pair a day's punches into sessions (CHECK_IN → next CHECK_OUT).
 * Falls back to the day row's inTime/outTime when there are no punches.
 */
export const summarizeDayPunches = (
  punches: FacultyPunchRow[],
  row?: FacultyDayRowTimes | null
): FacultyDaySessionSummary => {
  if (punches.length === 0) return summarizeFromRowTimes(row);

  const sorted = [...punches].sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  let openIn: FacultyPunchRow | null = null;
  let firstIn: string | null = null;
  let lastOut: string | null = null;
  let sessionCount = 0;
  let totalMs = 0;

  for (const p of sorted) {
    if (p.type === "CHECK_IN") {
      firstIn ??= p.timeHmm;
      if (!openIn) {
        openIn = p;
        sessionCount += 1;
      }
    } else {
      lastOut = p.timeHmm;
      if (openIn) {
        totalMs += Math.max(0, p.punchedAt.getTime() - openIn.punchedAt.getTime());
        openIn = null;
      }
    }
  }

  return {
    punches: sorted.map(toPunchDto),
    openSession: openIn !== null,
    firstIn,
    lastOut,
    sessionCount,
    totalMinutes: Math.round(totalMs / 60000),
  };
};

/** Group punches by `${facultyId}|${YYYY-MM-DD}`. */
export const groupPunchesByFacultyDay = (
  punches: FacultyPunchRow[]
): Map<string, FacultyPunchRow[]> => {
  const map = new Map<string, FacultyPunchRow[]>();
  for (const p of punches) {
    const key = `${p.facultyId}|${toDateKey(p.date)}`;
    const list = map.get(key);
    if (list) list.push(p);
    else map.set(key, [p]);
  }
  return map;
};

export const facultyDayKey = (facultyId: string, dateKey: string) => `${facultyId}|${dateKey}`;
