export type StudentRiskFlag = "Normal" | "At Risk" | "Triggered";

/**
 * Theory attendance newest-first. LEAVE is skipped; ABSENT increments; PRESENT/other breaks.
 */
export const computeConsecutiveTheoryAbsences = (
  theoryStatusesNewestFirst: Array<{ status: string }>
): number => {
  let consecutive = 0;
  for (const record of theoryStatusesNewestFirst) {
    const status = String(record.status).toUpperCase();
    if (status === "LEAVE") continue;
    if (status === "ABSENT") {
      consecutive += 1;
      continue;
    }
    break;
  }
  return consecutive;
};

/**
 * Risk aligned with attendance report + discontinuation workflow:
 * - Triggered: consecutive theory absences >= 3
 * - At Risk: consecutive === 2, or attendance < 75% with conducted classes
 * - Normal: otherwise
 */
export const resolveStudentRiskFlag = (
  consecutiveTheoryAbsences: number,
  attendancePercentage: number,
  conductedCount: number
): StudentRiskFlag => {
  if (consecutiveTheoryAbsences >= 3) return "Triggered";
  if (
    consecutiveTheoryAbsences >= 2 ||
    (conductedCount > 0 && attendancePercentage < 75)
  ) {
    return "At Risk";
  }
  return "Normal";
};

/** Average attendance across students who have conducted classes; null when none. */
export const computeAvgAttendanceRate = (
  rows: Array<{ attendancePercentage: number; conductedCount: number }>
): number | null => {
  const withClasses = rows.filter((r) => r.conductedCount > 0);
  if (withClasses.length === 0) return null;
  const sum = withClasses.reduce((acc, r) => acc + r.attendancePercentage, 0);
  return Math.round(sum / withClasses.length);
};

export const computeAssignmentCompletionRate = (
  completed: number,
  available: number
): number | null => {
  if (available <= 0) return null;
  return Math.round((completed / available) * 100);
};
