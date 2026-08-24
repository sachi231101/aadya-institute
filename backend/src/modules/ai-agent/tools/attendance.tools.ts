import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";

export const executeGetAttendanceSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const whereClause: any = {
    classSession: {
      batch: {
        instituteId: context.instituteId,
        ...(context.branchId ? { branchId: context.branchId } : {}),
      },
    },
  };

  const [totalRecords, presentRecords, absentRecords, leaveRecords] = await Promise.all([
    prisma.studentAttendance.count({ where: whereClause }),
    prisma.studentAttendance.count({ where: { ...whereClause, status: "PRESENT" } }),
    prisma.studentAttendance.count({ where: { ...whereClause, status: "ABSENT" } }),
    prisma.studentAttendance.count({ where: { ...whereClause, status: "LEAVE" } }),
  ]);

  const overallRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;
  const scopeLabel = context.branchId ? "in your branch" : "across the institute";

  return {
    totalRecords,
    presentRecords,
    absentRecords,
    leaveRecords,
    overallAttendancePercentage: overallRate,
    summaryText: `Overall class attendance ${scopeLabel} is ${overallRate}% (${presentRecords} present, ${absentRecords} absent, ${leaveRecords} on leave across ${totalRecords} total records).`,
  };
};

export const executeGetLowAttendanceStudents = async (
  context: AIToolAuthContext,
  args: { threshold?: number; limit?: number }
) => {
  const threshold = typeof args.threshold === "number" ? args.threshold : 75;
  const limit = Math.min(20, Math.max(1, args.limit || 10));

  // Find all active students in scope
  const students = await prisma.student.findMany({
    where: {
      instituteId: context.instituteId,
      status: "ACTIVE",
      ...(context.branchId ? { branchId: context.branchId } : {}),
    },
    include: {
      user: { select: { name: true, phone: true } },
      branch: { select: { name: true } },
      studentAttendances: {
        select: { status: true },
      },
    },
  });

  const lowAttendanceList: Array<{
    studentId: string;
    studentCode: string;
    name: string;
    phone: string;
    totalClasses: number;
    presentClasses: number;
    attendancePercentage: number;
  }> = [];

  for (const s of students) {
    const total = s.studentAttendances.length;
    if (total === 0) continue; // Skip students with 0 classes recorded yet

    const present = s.studentAttendances.filter((a) => a.status === "PRESENT").length;
    const percentage = Math.round((present / total) * 100);

    if (percentage < threshold) {
      lowAttendanceList.push({
        studentId: s.id,
        studentCode: s.studentCode,
        name: s.user?.name || "Unknown",
        phone: s.user?.phone || "N/A",
        totalClasses: total,
        presentClasses: present,
        attendancePercentage: percentage,
      });
    }
  }

  // Sort ascending by attendance rate (worst attendance first)
  lowAttendanceList.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  const cappedList = lowAttendanceList.slice(0, limit);
  const scopeLabel = context.branchId ? "in your branch" : "across the institute";

  const studentDetailsText = cappedList.length > 0
    ? `\nKey students:\n` + cappedList.map((s) => `- ${s.name} (${s.studentCode}): ${s.attendancePercentage}% (${s.presentClasses}/${s.totalClasses} classes)`).join("\n")
    : "";

  return {
    threshold,
    totalLowAttendanceCount: lowAttendanceList.length,
    students: cappedList,
    summaryText: `There are ${lowAttendanceList.length} active student(s) with attendance below ${threshold}% ${scopeLabel}.${studentDetailsText}`,
  };
};

export const executeGetBatchAttendance = async (
  context: AIToolAuthContext,
  args: { batchId?: string; batchName?: string }
) => {
  const batchWhere: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
    ...(args.batchId ? { id: args.batchId } : {}),
    ...(args.batchName ? { name: { contains: args.batchName, mode: "insensitive" } } : {}),
  };

  const batch = await prisma.batch.findFirst({
    where: batchWhere,
    include: {
      course: { select: { name: true } },
      classSessions: {
        include: {
          attendance: { select: { status: true } },
        },
      },
    },
  });

  if (!batch) {
    return {
      found: false,
      summaryText: "Batch not found or is outside your authorized branch scope.",
    };
  }

  let totalRecords = 0;
  let presentRecords = 0;
  for (const session of (batch as any).classSessions || []) {
    for (const att of (session as any).attendance || []) {
      totalRecords++;
      if (att.status === "PRESENT") presentRecords++;
    }
  }

  const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;

  return {
    found: true,
    batch: {
      id: batch.id,
      name: batch.name,
      course: (batch as any).course?.name,
      totalSessions: ((batch as any).classSessions || []).length,
      attendancePercentage: `${attendancePercentage}%`,
    },
    summaryText: `Batch "${batch.name}" has an overall attendance rate of ${attendancePercentage}% across ${((batch as any).classSessions || []).length} sessions.`,
  };
};
