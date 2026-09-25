import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";

export interface StudentSummaryResult {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  byCourse: Array<{ courseName: string; studentCount: number }>;
  summaryText: string;
}

const scopeWhere = (context: AIToolAuthContext) => ({
  instituteId: context.instituteId,
  ...(context.branchId ? { branchId: context.branchId } : {}),
});

/** Digits-only phone match helper (last 10 digits preferred). */
function phoneSearchVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];
  const variants = new Set<string>([digits]);
  if (digits.length >= 10) variants.add(digits.slice(-10));
  return [...variants];
}

export const executeGetStudentSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
): Promise<StudentSummaryResult> => {
  const whereClause: any = scopeWhere(context);

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
  const phoneVariants = phoneSearchVariants(searchTerm);

  const whereClause: any = {
    ...scopeWhere(context),
    ...(searchTerm
      ? {
          OR: [
            { studentCode: { contains: searchTerm, mode: "insensitive" } },
            { user: { name: { contains: searchTerm, mode: "insensitive" } } },
            { user: { email: { contains: searchTerm, mode: "insensitive" } } },
            { user: { phone: { contains: searchTerm, mode: "insensitive" } } },
            ...phoneVariants.flatMap((d) => [
              { user: { phone: { contains: d } } },
            ]),
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
        ? `Found ${formatted.length} student(s) matching "${searchTerm}": ${formatted.map((s) => `${s.name} (${s.studentCode})`).join(", ")}. Ask for full details by name, phone, or student code.`
        : `No students found matching "${searchTerm}".`,
  };
};

type StudentDetailsArgs = {
  studentId?: string;
  studentCode?: string;
  name?: string;
  phone?: string;
  /** Free-text: name, phone, email, or student code */
  query?: string;
};

async function findStudentsForDetails(context: AIToolAuthContext, args: StudentDetailsArgs) {
  const base = scopeWhere(context);

  if (args.studentId?.trim()) {
    return prisma.student.findMany({
      where: { ...base, id: args.studentId.trim() },
      take: 5,
      include: studentDetailsInclude,
    });
  }

  if (args.studentCode?.trim()) {
    return prisma.student.findMany({
      where: { ...base, studentCode: { equals: args.studentCode.trim(), mode: "insensitive" } },
      take: 5,
      include: studentDetailsInclude,
    });
  }

  const query = (args.query || args.name || args.phone || "").trim();
  if (!query) return [];

  const phoneVariants = phoneSearchVariants(query);
  const looksLikePhone = phoneVariants.length > 0 && /\d{6,}/.test(query.replace(/\D/g, ""));

  return prisma.student.findMany({
    where: {
      ...base,
      OR: [
        { studentCode: { equals: query, mode: "insensitive" } },
        { studentCode: { contains: query, mode: "insensitive" } },
        { user: { name: { equals: query, mode: "insensitive" } } },
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { phone: { contains: query, mode: "insensitive" } } },
        ...(looksLikePhone
          ? phoneVariants.map((d) => ({ user: { phone: { contains: d } } }))
          : []),
      ],
    },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: studentDetailsInclude,
  });
}

const studentDetailsInclude = {
  user: { select: { name: true, email: true, phone: true, status: true } },
  branch: { select: { name: true, code: true } },
  qualificationMaster: { select: { name: true } },
  areaMaster: { select: { name: true } },
  admissions: {
    orderBy: { createdAt: "desc" as const },
    include: {
      course: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true, code: true } },
    },
  },
  batchEnrollments: {
    take: 5,
    orderBy: { joinedAt: "desc" as const },
    include: {
      batch: { select: { name: true, code: true, status: true } },
    },
  },
  studentAttendances: {
    take: 100,
    orderBy: { markedAt: "desc" as const },
    select: { status: true },
  },
  pendingFees: {
    select: {
      totalFee: true,
      amountPaid: true,
      dueAmount: true,
      status: true,
      dueDate: true,
    },
  },
  studentInvoices: {
    take: 5,
    orderBy: { createdAt: "desc" as const },
    select: {
      invoiceNo: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      balance: true,
    },
  },
};

function formatStudentFullDetails(student: Awaited<ReturnType<typeof findStudentsForDetails>>[number]) {
  const totalClasses = student.studentAttendances.length;
  const presentClasses = student.studentAttendances.filter((a) => a.status === "PRESENT").length;
  const absentClasses = student.studentAttendances.filter((a) => a.status === "ABSENT").length;
  const leaveClasses = student.studentAttendances.filter((a) => a.status === "LEAVE").length;
  const attendancePercentage =
    totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : null;

  const totalPendingFee = student.pendingFees.reduce(
    (acc, pf) => acc + Number(pf.dueAmount || 0),
    0
  );
  const totalFee = student.pendingFees.reduce((acc, pf) => acc + Number(pf.totalFee || 0), 0);
  const totalPaid = student.pendingFees.reduce((acc, pf) => acc + Number(pf.amountPaid || 0), 0);

  const admissions = student.admissions.map((a) => ({
    course: a.course?.name || "N/A",
    courseCode: a.course?.code || null,
    batch: a.batch?.name || "N/A",
    batchCode: a.batch?.code || null,
    status: a.status || null,
  }));

  const primary = admissions[0];

  const details = {
    id: student.id,
    studentCode: student.studentCode,
    name: student.user?.name || "N/A",
    email: student.user?.email || "N/A",
    phone: student.user?.phone || "N/A",
    status: student.status,
    gender: student.gender || null,
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().slice(0, 10) : null,
    qualification: student.qualificationMaster?.name || student.qualification || null,
    area: student.areaMaster?.name || null,
    branch: student.branch?.name || "N/A",
    branchCode: student.branch?.code || null,
    course: primary?.course || "N/A",
    batch: primary?.batch || "N/A",
    admissions,
    enrollments: student.batchEnrollments.map((e) => ({
      batch: e.batch?.name,
      batchCode: e.batch?.code,
      status: e.status,
    })),
    attendance: {
      rate: attendancePercentage !== null ? `${attendancePercentage}%` : "N/A",
      recordedSessions: totalClasses,
      present: presentClasses,
      absent: absentClasses,
      leave: leaveClasses,
    },
    fees: {
      totalFee,
      totalPaid,
      pendingAmount: totalPendingFee,
      pendingItems: student.pendingFees.length,
      recentInvoices: student.studentInvoices.map((inv) => ({
        number: inv.invoiceNo,
        status: inv.status,
        total: Number(inv.totalAmount || 0),
        paid: Number(inv.amountPaid || 0),
        due: Number(inv.balance || 0),
      })),
    },
  };

  const summaryText = [
    `Student: ${details.name} (${details.studentCode})`,
    `Phone: ${details.phone} | Email: ${details.email}`,
    `Branch: ${details.branch} | Status: ${details.status}`,
    `Course: ${details.course} | Batch: ${details.batch}`,
    details.gender ? `Gender: ${details.gender}` : null,
    details.dateOfBirth ? `DOB: ${details.dateOfBirth}` : null,
    details.qualification ? `Qualification: ${details.qualification}` : null,
    `Attendance: ${details.attendance.rate} (${presentClasses} present / ${absentClasses} absent / ${leaveClasses} leave of ${totalClasses} recorded)`,
    `Fees: ₹${totalPendingFee.toLocaleString("en-IN")} pending (paid ₹${totalPaid.toLocaleString("en-IN")} of ₹${totalFee.toLocaleString("en-IN")})`,
  ]
    .filter(Boolean)
    .join("\n");

  return { details, summaryText };
}

/**
 * Resolve a student by id, code, name, phone, or free-text query and return full details.
 * If multiple matches: return a short list so the user can clarify.
 */
export const executeGetStudentDetails = async (
  context: AIToolAuthContext,
  args: StudentDetailsArgs
) => {
  const queryHint = (args.query || args.name || args.phone || args.studentCode || args.studentId || "").trim();

  if (!queryHint) {
    return {
      found: false,
      summaryText:
        "Please provide a student name, phone number, student code, or ID to look up details.",
    };
  }

  const matches = await findStudentsForDetails(context, args);

  if (matches.length === 0) {
    return {
      found: false,
      summaryText: `No student found matching "${queryHint}" in your authorized scope.`,
    };
  }

  if (matches.length > 1) {
    // Prefer exact name/phone/code match when possible
    const lower = queryHint.toLowerCase();
    const digits = queryHint.replace(/\D/g, "");
    const exact = matches.filter((s) => {
      const name = (s.user?.name || "").toLowerCase();
      const phone = (s.user?.phone || "").replace(/\D/g, "");
      const code = (s.studentCode || "").toLowerCase();
      return (
        name === lower ||
        code === lower ||
        (digits.length >= 8 && phone.endsWith(digits.slice(-10)))
      );
    });

    if (exact.length === 1) {
      const { details, summaryText } = formatStudentFullDetails(exact[0]);
      return { found: true, matchCount: 1, student: details, summaryText };
    }

    const list = matches.slice(0, 5).map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.user?.name || "N/A",
      phone: s.user?.phone || "N/A",
      course: s.admissions[0]?.course?.name || "N/A",
      batch: s.admissions[0]?.batch?.name || "N/A",
    }));

    return {
      found: false,
      multipleMatches: true,
      matchCount: matches.length,
      students: list,
      summaryText: `Found ${matches.length} students matching "${queryHint}". Please clarify with full name, phone, or student code:\n${list
        .map((s, i) => `${i + 1}. ${s.name} (${s.studentCode}) — ${s.phone} — ${s.course}`)
        .join("\n")}`,
    };
  }

  const { details, summaryText } = formatStudentFullDetails(matches[0]);
  return { found: true, matchCount: 1, student: details, summaryText };
};
