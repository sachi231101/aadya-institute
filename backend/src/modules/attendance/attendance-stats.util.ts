import { prisma } from "../../config/database";

export type StudentAttendanceSummary = {
  presentCount: number;
  conductedCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number;
};

export const emptyAttendanceSummary = (): StudentAttendanceSummary => ({
  presentCount: 0,
  conductedCount: 0,
  absentCount: 0,
  leaveCount: 0,
  attendancePercentage: 0,
});

export const computeAttendancePercentage = (presentCount: number, conductedCount: number): number =>
  conductedCount > 0 ? Math.round((presentCount / conductedCount) * 10000) / 100 : 0;

/**
 * Present ÷ Conducted × 100.
 * Conducted = non-CANCELLED class sessions in the student's enrolled batches that were held
 * (COMPLETED/LIVE) or have any attendance row for that session.
 * Present = PRESENT marks only; LEAVE/ABSENT count in conducted when a row exists (or session held).
 */
export const computeStudentAttendanceSummaries = async (
  studentIds: string[],
  options?: { batchIds?: string[]; dateFrom?: string; dateTo?: string }
): Promise<Map<string, StudentAttendanceSummary>> => {
  const result = new Map<string, StudentAttendanceSummary>();
  for (const id of studentIds) {
    result.set(id, emptyAttendanceSummary());
  }
  if (studentIds.length === 0) return result;

  const enrollments = await prisma.batchEnrollment.findMany({
    where: {
      studentId: { in: studentIds },
      status: "ACTIVE",
      ...(options?.batchIds?.length
        ? { batchId: { in: options.batchIds } }
        : {}),
    },
    select: { studentId: true, batchId: true },
  });

  const batchIdsByStudent = new Map<string, Set<string>>();
  const allBatchIds = new Set<string>();
  for (const e of enrollments) {
    if (!batchIdsByStudent.has(e.studentId)) {
      batchIdsByStudent.set(e.studentId, new Set());
    }
    batchIdsByStudent.get(e.studentId)!.add(e.batchId);
    allBatchIds.add(e.batchId);
  }

  if (allBatchIds.size === 0) return result;

  const scheduledDateFilter =
    options?.dateFrom || options?.dateTo
      ? {
          scheduledDate: {
            ...(options.dateFrom
              ? { gte: new Date(`${options.dateFrom}T00:00:00.000Z`) }
              : {}),
            ...(options.dateTo
              ? { lte: new Date(`${options.dateTo}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {};

  const sessions = await prisma.classSession.findMany({
    where: {
      batchId: { in: [...allBatchIds] },
      status: "ACTIVE",
      sessionStatus: { not: "CANCELLED" },
      ...scheduledDateFilter,
      OR: [
        { sessionStatus: { in: ["COMPLETED", "LIVE"] } },
        { attendance: { some: {} } },
      ],
    },
    select: {
      id: true,
      batchId: true,
      attendance: {
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true },
      },
    },
  });

  for (const session of sessions) {
    const marksByStudent = new Map(
      session.attendance.map((a) => [a.studentId, String(a.status).toUpperCase()])
    );

    for (const studentId of studentIds) {
      const batches = batchIdsByStudent.get(studentId);
      if (!batches?.has(session.batchId)) continue;

      const stats = result.get(studentId)!;
      stats.conductedCount += 1;

      const status = marksByStudent.get(studentId);
      if (status === "PRESENT") stats.presentCount += 1;
      else if (status === "ABSENT") stats.absentCount += 1;
      else if (status === "LEAVE") stats.leaveCount += 1;
    }
  }

  for (const stats of result.values()) {
    stats.attendancePercentage = computeAttendancePercentage(
      stats.presentCount,
      stats.conductedCount
    );
  }

  return result;
};

export const computeStudentAttendanceSummary = async (
  studentId: string,
  options?: { batchIds?: string[]; dateFrom?: string; dateTo?: string }
): Promise<StudentAttendanceSummary> => {
  const map = await computeStudentAttendanceSummaries([studentId], options);
  return map.get(studentId) ?? emptyAttendanceSummary();
};
