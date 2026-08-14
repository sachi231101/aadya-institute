import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";

export interface StudentSummaryResult {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  byCourse: Array<{ courseName: string; studentCount: number }>;
  summaryText: string;
}

export const executeGetStudentSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
): Promise<StudentSummaryResult> => {
  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const [totalStudents, activeStudents, inactiveStudents, admissions] = await Promise.all([
    prisma.student.count({ where: whereClause }),
    prisma.student.count({ where: { ...whereClause, status: "ACTIVE" } }),
    prisma.student.count({ where: { ...whereClause, status: { not: "ACTIVE" } } }),
    prisma.admission.groupBy({
      by: ["courseId"],
      where: {
        instituteId: context.instituteId,
        ...(context.branchId ? { branchId: context.branchId } : {}),
        status: { in: ["CONFIRMED", "ACTIVE"] },
      },
      _count: { studentId: true },
    }),
  ]);

  const courseIds = admissions.map((a) => a.courseId).filter(Boolean) as string[];
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, name: true },
  });

  const courseMap = new Map(courses.map((c) => [c.id, c.name]));
  const byCourse = admissions.map((a) => ({
    courseName: (a.courseId && courseMap.get(a.courseId)) || "General",
    studentCount: a._count.studentId,
  }));

  const scopeLabel = context.branchId ? "in your branch" : "across the institute";
  const summaryText = `There are ${totalStudents} total students ${scopeLabel} (${activeStudents} active, ${inactiveStudents} inactive).`;

  return {
    totalStudents,
    activeStudents,
    inactiveStudents,
    byCourse,
    summaryText,
  };
};

export const executeSearchStudents = async (
  context: AIToolAuthContext,
  args: { query?: string; limit?: number }
) => {
  const searchTerm = (args.query || "").trim();
  const limit = Math.min(10, Math.max(1, args.limit || 5));

  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
    ...(searchTerm
      ? {
          OR: [
            { studentCode: { contains: searchTerm, mode: "insensitive" } },
            { user: { name: { contains: searchTerm, mode: "insensitive" } } },
            { user: { email: { contains: searchTerm, mode: "insensitive" } } },
            { user: { phone: { contains: searchTerm, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const students = await prisma.student.findMany({
    where: whereClause,
    take: limit,
    include: {
      user: { select: { name: true, email: true, phone: true, status: true } },
      branch: { select: { name: true, code: true } },
      admissions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { course: { select: { name: true } }, batch: { select: { name: true } } },
      },
    },
  });

  const formatted = students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    name: s.user?.name || "N/A",
    email: s.user?.email || "N/A",
    phone: s.user?.phone || "N/A",
    branch: s.branch?.name || "N/A",
    status: s.status,
    course: s.admissions[0]?.course?.name || "N/A",
    batch: s.admissions[0]?.batch?.name || "N/A",
  }));

  return {
    count: formatted.length,
    students: formatted,
    summaryText:
      formatted.length > 0
        ? `Found ${formatted.length} student(s) matching "${searchTerm}": ${formatted.map((s) => `${s.name} (${s.studentCode})`).join(", ")}.`
        : `No students found matching "${searchTerm}".`,
  };
};

export const executeGetStudentDetails = async (
  context: AIToolAuthContext,
  args: { studentId?: string; studentCode?: string }
) => {
  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
    ...(args.studentId ? { id: args.studentId } : {}),
    ...(args.studentCode ? { studentCode: args.studentCode } : {}),
  };

  const student = await prisma.student.findFirst({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true, phone: true, status: true } },
      branch: { select: { name: true } },
      admissions: {
        include: { course: true, batch: true },
      },
      studentAttendances: {
        take: 50,
        select: { status: true },
      },
      pendingFees: {
        select: { totalFee: true, amountPaid: true, dueAmount: true, status: true, dueDate: true },
      },
    },
  });

  if (!student) {
    return {
      found: false,
      summaryText: "Student record was not found or is outside your authorized branch scope.",
    };
  }

  const totalClasses = student.studentAttendances.length;
  const presentClasses = student.studentAttendances.filter((a) => a.status === "PRESENT").length;
  const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

  const totalPendingFee = student.pendingFees.reduce((acc, pf) => acc + (pf.dueAmount || 0), 0);

  return {
    found: true,
    student: {
      id: student.id,
      code: student.studentCode,
      name: student.user?.name,
      email: student.user?.email,
      phone: student.user?.phone,
      branch: student.branch?.name,
      attendanceRate: `${attendancePercentage}%`,
      totalClasses,
      pendingFeeAmount: totalPendingFee,
      course: student.admissions[0]?.course?.name,
      batch: student.admissions[0]?.batch?.name,
    },
    summaryText: `Student: ${student.user?.name} (${student.studentCode}), Attendance: ${attendancePercentage}%, Pending Fee: ₹${totalPendingFee}.`,
  };
};
