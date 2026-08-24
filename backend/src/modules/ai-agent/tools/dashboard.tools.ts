import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";
import { startOfDay, endOfDay } from "date-fns";

export const executeGetBranchSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const branchWhere: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const [
    totalStudents,
    activeBatches,
    activeLeads,
    pendingFollowUps,
    totalPendingFeesAgg,
    branchInfo,
  ] = await Promise.all([
    prisma.student.count({ where: { ...branchWhere, status: "ACTIVE" } }),
    prisma.batch.count({ where: { ...branchWhere, status: "ACTIVE" } }),
    prisma.lead.count({ where: { ...branchWhere, status: "ACTIVE" } }),
    prisma.leadFollowUp.count({
      where: {
        lead: branchWhere,
        status: "PENDING",
      },
    }),
    prisma.pendingFee.aggregate({
      where: branchWhere,
      _sum: { dueAmount: true },
    }),
    context.branchId
      ? prisma.branch.findUnique({
          where: { id: context.branchId },
          select: { name: true, code: true },
        })
      : null,
  ]);

  const scopeName = branchInfo ? `${branchInfo.name} Branch` : "Institute-wide Overview";
  const totalPending = totalPendingFeesAgg._sum.dueAmount || 0;

  return {
    scopeName,
    activeStudents: totalStudents,
    activeBatches,
    activeLeads,
    pendingFollowUps,
    totalPendingFees: totalPending,
    summaryText: `${scopeName} Summary: ${totalStudents} active students, ${activeBatches} active batches, ${activeLeads} active leads, ${pendingFollowUps} pending follow-ups, and ₹${totalPending.toLocaleString("en-IN")} total pending fees.`,
  };
};

export const executeGetDailyOperationsSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const baseWhere: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const [
    todaySessions,
    todayAdmissions,
    todayFollowUps,
  ] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        batch: baseWhere,
        scheduledDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        batch: { select: { name: true } },
        faculty: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.admission.count({
      where: {
        ...baseWhere,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.leadFollowUp.count({
      where: {
        lead: baseWhere,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: "PENDING",
      },
    }),
  ]);

  return {
    todayDate: todayStart.toISOString().split("T")[0],
    todaySessionsCount: todaySessions.length,
    todayAdmissionsCount: todayAdmissions,
    todayPendingFollowUpsCount: todayFollowUps,
    sessions: todaySessions.map((s) => ({
      title: s.title,
      batch: s.batch.name,
      faculty: s.faculty?.user?.name || "N/A",
      startTime: s.startTime,
      endTime: s.endTime,
      isCompleted: s.sessionStatus === "COMPLETED",
    })),
    summaryText: `Daily Operations (${todayStart.toISOString().split("T")[0]}): ${todaySessions.length} classes scheduled, ${todayAdmissions} new admissions, and ${todayFollowUps} follow-ups due today.`,
  };
};
