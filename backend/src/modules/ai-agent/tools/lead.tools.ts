import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const executeGetLeadSummary = async (
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

  const [totalLeads, converted, interested, followUp, contacted, assigned, newStage, lost] = await Promise.all([
    prisma.lead.count({ where: whereClause }),
    prisma.lead.count({ where: { ...whereClause, stage: "CONVERTED" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "INTERESTED" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "FOLLOW_UP" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "CONTACTED" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "ASSIGNED" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "NEW" } }),
    prisma.lead.count({ where: { ...whereClause, stage: "LOST" } }),
  ]);

  const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) + "%" : "0%";
  const scopeLabel = context.branchId ? "in your branch" : "across the institute";

  return {
    period,
    totalLeads,
    converted,
    interested,
    followUp,
    contacted,
    assigned,
    newLeads: newStage,
    lost,
    conversionRate,
    summaryText: `Lead summary (${period}) ${scopeLabel}: ${totalLeads} total leads, ${converted} converted (${conversionRate} conversion rate), ${interested} interested, ${followUp} in follow-up, ${newStage + assigned + contacted} in early pipeline, and ${lost} lost.`,
  };
};

export const executeGetCounsellorPerformance = async (
  context: AIToolAuthContext,
  args: { period?: "month" | "all" }
) => {
  const counsellors = await prisma.user.findMany({
    where: {
      instituteId: context.instituteId,
      ...(context.branchId ? { branchId: context.branchId } : {}),
      userRoles: { some: { role: { name: "COUNSELLOR" } } },
    },
    select: { id: true, name: true, email: true },
  });

  const performanceList = [];

  for (const c of counsellors) {
    const [totalAssigned, converted, lost] = await Promise.all([
      prisma.lead.count({
        where: {
          instituteId: context.instituteId,
          assignedCounsellorId: c.id,
        },
      }),
      prisma.lead.count({
        where: {
          instituteId: context.instituteId,
          assignedCounsellorId: c.id,
          stage: "CONVERTED",
        },
      }),
      prisma.lead.count({
        where: {
          instituteId: context.instituteId,
          assignedCounsellorId: c.id,
          stage: "LOST",
        },
      }),
    ]);

    const conversionRate = totalAssigned > 0 ? ((converted / totalAssigned) * 100).toFixed(1) + "%" : "0%";

    performanceList.push({
      counsellorId: c.id,
      name: c.name,
      totalAssigned,
      converted,
      lost,
      conversionRate,
      conversionRateNum: totalAssigned > 0 ? (converted / totalAssigned) * 100 : 0,
    });
  }

  // Sort descending by highest converted leads
  performanceList.sort((a, b) => b.converted - a.converted);

  const topPerformer = performanceList[0];
  const summaryText =
    performanceList.length > 0
      ? `Top performing counsellor: ${topPerformer.name} with ${topPerformer.converted} converted leads (${topPerformer.conversionRate} conversion rate from ${topPerformer.totalAssigned} total assigned leads).`
      : "No counsellor performance records found.";

  return {
    counsellors: performanceList,
    topPerformer: topPerformer || null,
    summaryText,
  };
};

export const executeGetLeadFollowups = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const baseWhere: any = {
    lead: {
      instituteId: context.instituteId,
      ...(context.branchId ? { branchId: context.branchId } : {}),
    },
    status: "PENDING",
  };

  const [overdueCount, todayCount, upcomingCount, todayFollowUps] = await Promise.all([
    prisma.leadFollowUp.count({
      where: { ...baseWhere, scheduledAt: { lt: todayStart } },
    }),
    prisma.leadFollowUp.count({
      where: { ...baseWhere, scheduledAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.leadFollowUp.count({
      where: { ...baseWhere, scheduledAt: { gt: todayEnd } },
    }),
    prisma.leadFollowUp.findMany({
      where: { ...baseWhere, scheduledAt: { gte: todayStart, lte: todayEnd } },
      take: 5,
      include: {
        lead: { select: { name: true, phoneNumber: true, interestedIn: true } },
        counsellor: { select: { name: true } },
      },
    }),
  ]);

  const followUpDetails = todayFollowUps.map((f) => ({
    id: f.id,
    leadName: f.lead.name,
    phone: f.lead.phoneNumber,
    course: f.lead.interestedIn,
    counsellor: f.counsellor.name,
    notes: f.notes,
  }));

  return {
    overdueCount,
    todayCount,
    upcomingCount,
    todayFollowUps: followUpDetails,
    summaryText: `Follow-up tasks: ${todayCount} scheduled for today, ${overdueCount} overdue, and ${upcomingCount} upcoming.`,
  };
};
