import { prisma } from "../../../config/database";
import type { AIToolAuthContext } from "../security/ai-scope.service";

export const executeGetFeeSummary = async (
  context: AIToolAuthContext,
  _args: Record<string, any>
) => {
  const paymentWhere: any = {
    instituteId: context.instituteId,
    status: "SUCCESS",
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const pendingWhere: any = {
    instituteId: context.instituteId,
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const [paymentAgg, pendingAgg, overdueCount] = await Promise.all([
    prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.pendingFee.aggregate({
      where: pendingWhere,
      _sum: { totalFee: true, amountPaid: true, dueAmount: true },
      _count: { id: true },
    }),
    prisma.pendingFee.count({
      where: {
        ...pendingWhere,
        status: { in: ["OVERDUE", "DUE_SOON", "PARTIAL"] },
        dueAmount: { gt: 0 },
      },
    }),
  ]);

  const totalCollected = paymentAgg._sum.amount || 0;
  const totalPendingDue = pendingAgg._sum.dueAmount || 0;
  const scopeLabel = context.branchId ? "in your branch" : "across the institute";

  return {
    totalCollectedFees: totalCollected,
    totalPendingDue,
    overdueRecordsCount: overdueCount,
    totalPaymentsCount: paymentAgg._count.id,
    summaryText: `Fee summary ${scopeLabel}: Total collected fees are ₹${totalCollected.toLocaleString("en-IN")}, and total pending fees are ₹${totalPendingDue.toLocaleString("en-IN")} across ${overdueCount} pending/overdue records.`,
  };
};

export const executeGetOverdueFees = async (
  context: AIToolAuthContext,
  args: { limit?: number }
) => {
  const limit = Math.min(20, Math.max(1, args.limit || 10));

  const whereClause: any = {
    instituteId: context.instituteId,
    dueAmount: { gt: 0 },
    status: { in: ["OVERDUE", "DUE_SOON", "PARTIAL"] },
    ...(context.branchId ? { branchId: context.branchId } : {}),
  };

  const pendingList = await prisma.pendingFee.findMany({
    where: whereClause,
    take: limit,
    orderBy: { dueAmount: "desc" },
    include: {
      student: {
        include: {
          user: { select: { name: true, phone: true } },
          branch: { select: { name: true } },
        },
      },
    },
  });

  const formatted = pendingList.map((pf) => ({
    pendingFeeId: pf.id,
    studentName: pf.studentName || pf.student?.user?.name || "Unknown",
    studentPhone: pf.phone || pf.student?.user?.phone || "N/A",
    studentCode: pf.student?.studentCode || pf.admissionNo,
    branch: pf.student?.branch?.name || "N/A",
    totalFee: pf.totalFee,
    amountPaid: pf.amountPaid,
    dueAmount: pf.dueAmount,
    dueDate: pf.dueDate.toISOString().split("T")[0],
  }));

  const totalOverdueAmount = formatted.reduce((acc, curr) => acc + curr.dueAmount, 0);

  return {
    count: formatted.length,
    totalOverdueSampleAmount: totalOverdueAmount,
    studentsWithPendingFees: formatted,
    summaryText:
      formatted.length > 0
        ? `Found ${formatted.length} student(s) with pending/overdue fees:\n` +
          formatted.map((f) => `- ${f.studentName} (${f.studentCode}): ₹${f.dueAmount} due by ${f.dueDate}`).join("\n")
        : "No students with overdue fees found.",
  };
};
