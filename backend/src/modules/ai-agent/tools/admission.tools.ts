import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";
import { subDays, startOfDay } from "date-fns";

export const executeGetAdmissionSummary = async (
  context: AIToolAuthContext,
  args: { period?: "today" | "week" | "month" | "all" }
) => {
  const period = args.period || "month";
  let startDate: Date | undefined;
  const now = new Date();

  if (period === "today") {
    startDate = startOfDay(now);
  } else if (period === "week") {
    startDate = subDays(now, 7);
  } else if (period === "month") {
    startDate = subDays(now, 30);
  }

  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };

  const [totalAdmissions, confirmedAdmissions, provisionalAdmissions, courseBreakdown] = await Promise.all([
    prisma.admission.count({ where: whereClause }),
    prisma.admission.count({ where: { ...whereClause, status: "CONFIRMED" } }),
    prisma.admission.count({ where: { ...whereClause, status: "PROVISIONAL" } }),
    prisma.admission.groupBy({
      by: ["courseId"],
      where: whereClause,
      _count: { id: true },
    }),
  ]);

  const courseIds = courseBreakdown.map((c) => c.courseId).filter(Boolean) as string[];
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, name: true },
  });
  const courseMap = new Map(courses.map((c) => [c.id, c.name]));

  const byCourse = courseBreakdown.map((cb) => ({
    courseName: (cb.courseId && courseMap.get(cb.courseId)) || "General",
    count: cb._count.id,
  }));

  const scopeLabel = context.branchId ? "in your branch" : "across the institute";

  return {
    period,
    totalAdmissions,
    confirmedAdmissions,
    provisionalAdmissions,
    byCourse,
    summaryText: `There are ${totalAdmissions} admissions (${period}) ${scopeLabel} (${confirmedAdmissions} confirmed, ${provisionalAdmissions} provisional).`,
  };
};

export const executeGetRecentAdmissions = async (
  context: AIToolAuthContext,
  args: { limit?: number }
) => {
  const limit = Math.min(15, Math.max(1, args.limit || 5));

  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const admissions = await prisma.admission.findMany({
    where: whereClause,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { name: true } },
      batch: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });

  const formatted = admissions.map((a) => ({
    admissionNo: a.admissionNo,
    studentName: a.studentName,
    course: a.course?.name || "N/A",
    batch: a.batch?.name || "N/A",
    branch: a.branch?.name || "N/A",
    status: a.status,
    feePlan: a.feePlan,
    date: a.createdAt.toISOString().split("T")[0],
  }));

  return {
    count: formatted.length,
    recentAdmissions: formatted,
    summaryText: `Recent admissions (${formatted.length}): ${formatted.map((a) => `${a.studentName} (${a.course}, ${a.admissionNo})`).join("; ")}.`,
  };
};
