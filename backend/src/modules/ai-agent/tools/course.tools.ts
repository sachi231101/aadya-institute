import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";

export const executeGetCourseSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const courses = await prisma.course.findMany({
    where: { instituteId: context.instituteId },
    include: {
      modules: { select: { id: true, name: true, sequence: true } },
      admissions: {
        where: {
          instituteId: context.instituteId,
          ...(context.branchId ? { branchId: context.branchId } : {}),
          status: { in: ["CONFIRMED", "ACTIVE"] },
        },
        select: { id: true },
      },
    },
  });

  const formatted = courses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    durationMonths: c.duration,
    moduleCount: c.modules.length,
    enrolledStudentsCount: c.admissions.length,
  }));

  // Sort descending by enrolled students
  formatted.sort((a, b) => b.enrolledStudentsCount - a.enrolledStudentsCount);

  return {
    totalCourses: formatted.length,
    courses: formatted,
    summaryText: `Courses summary (${formatted.length} courses):\n` +
      formatted.map((c) => `- ${c.name} (${c.code}): ${c.enrolledStudentsCount} students enrolled, ${c.durationMonths} months duration`).join("\n"),
  };
};

export const executeGetBatchSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const whereClause: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const batches = await prisma.batch.findMany({
    where: whereClause,
    include: {
      course: { select: { name: true } },
      faculty: { include: { user: { select: { name: true } } } },
      branch: { select: { name: true } },
      admissions: { select: { id: true } },
      batchModules: {
        where: { status: "ACTIVE" },
        include: { courseModule: { select: { name: true } } },
      },
    },
  });

  const formatted = batches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    status: b.status,
    course: b.course?.name || "N/A",
    faculty: b.faculty?.user?.name || "Unassigned",
    branch: b.branch?.name || "N/A",
    enrolledStudents: b.admissions.length,
    currentModule: b.batchModules[0]?.courseModule?.name || "Not started",
  }));

  return {
    totalBatches: formatted.length,
    batches: formatted,
    summaryText: `Batches summary (${formatted.length} total batches):\n` +
      formatted.map((b) => `- ${b.name} (${b.course}): ${b.enrolledStudents} students, Faculty: ${b.faculty}, Current Module: ${b.currentModule}`).join("\n"),
  };
};
