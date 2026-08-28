import { prisma } from "../../config/database";
import type {
  Prisma,
  PaymentStatus,
  OverdueStatus,
  PendingFee,
} from "@prisma/client";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
} from "./fee.types";

export const FeeRepository = {
  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  async findPayments(instituteId: string, params: QueryPaymentsDTO) {
    const { search, method, status, page = 1, limit = 50 } = params;

    const where: Prisma.PaymentWhereInput = {
      instituteId,
      ...(method && method !== "ALL" ? { method } : {}),
      ...(status && status !== "ALL" ? { status: status as PaymentStatus } : {}),
      ...(search
        ? {
            OR: [
              { receiptNo: { contains: search, mode: "insensitive" } },
              { studentName: { contains: search, mode: "insensitive" } },
              { admissionNo: { contains: search, mode: "insensitive" } },
              { courseName: { contains: search, mode: "insensitive" } },
              { transactionRef: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findPaymentById(id: string, instituteId: string) {
    return prisma.payment.findFirst({
      where: { id, instituteId },
    });
  },

  async createPayment(
    instituteId: string,
    branchId: string | null | undefined,
    receiptNo: string,
    dto: CreatePaymentDTO,
    recordedById?: string
  ) {
    return prisma.payment.create({
      data: {
        receiptNo,
        instituteId,
        branchId: branchId || null,
        studentName: dto.studentName,
        admissionNo: dto.admissionNo,
        courseName: dto.courseName,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        method: dto.method || "UPI",
        paymentModeMasterId: dto.paymentModeMasterId || null,
        bankAccountMasterId: dto.bankAccountMasterId || null,
        feeHeadMasterId: dto.feeHeadMasterId || null,
        feeHead: dto.feeHead || null,
        transactionRef: dto.transactionRef || null,
        status: (dto.status as PaymentStatus) || "SUCCESS",
        notes: dto.notes || null,
        studentId: dto.studentId || null,
        admissionId: dto.admissionId || null,
        pendingFeeId: dto.pendingFeeId || null,
        recordedById: recordedById || null,
      },
    });
  },

  async deletePayment(id: string, instituteId: string) {
    return prisma.payment.deleteMany({
      where: { id, instituteId },
    });
  },

  // ─── PENDING FEES ──────────────────────────────────────────────────────────
  async findPendingFees(instituteId: string, params: QueryPendingFeesDTO) {
    const { search, status, page = 1, limit = 50 } = params;

    const where: Prisma.PendingFeeWhereInput = {
      instituteId,
      ...(status && status !== "ALL" ? { status: status as OverdueStatus } : {}),
      ...(search
        ? {
            OR: [
              { studentName: { contains: search, mode: "insensitive" } },
              { admissionNo: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { courseName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.pendingFee.count({ where }),
      prisma.pendingFee.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findPendingFeeById(id: string, instituteId: string) {
    return prisma.pendingFee.findFirst({
      where: { id, instituteId },
    });
  },

  async recordPendingFeePayment(
    pendingItem: PendingFee,
    receiptNo: string,
    dto: CollectPendingFeeDTO,
    recordedById?: string
  ) {
    const newAmountPaid = pendingItem.amountPaid + dto.amountPaidNow;
    const newDueAmount = Math.max(0, pendingItem.totalFee - newAmountPaid);
    const newStatus: OverdueStatus = newDueAmount === 0 ? "PAID" : "PARTIAL";

    return prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          instituteId: pendingItem.instituteId,
          branchId: pendingItem.branchId,
          studentName: pendingItem.studentName,
          admissionNo: pendingItem.admissionNo,
          courseName: pendingItem.courseName,
          amount: dto.amountPaidNow,
          date: new Date(),
          method: dto.method || "UPI",
          paymentModeMasterId: dto.paymentModeMasterId || null,
          feeHeadMasterId: dto.feeHeadMasterId || pendingItem.feeHeadMasterId || null,
          feeHead: dto.feeHead || pendingItem.feeHead || null,
          transactionRef: dto.transactionRef || null,
          status: "SUCCESS",
          notes: dto.notes || `Collected for Installment #${pendingItem.installmentNo}`,
          studentId: pendingItem.studentId,
          admissionId: pendingItem.admissionId,
          pendingFeeId: pendingItem.id,
          recordedById: recordedById || null,
        },
      });

      // 2. Update PendingFee
      const updatedPending = await tx.pendingFee.update({
        where: { id: pendingItem.id },
        data: {
          amountPaid: newAmountPaid,
          dueAmount: newDueAmount,
          status: newStatus,
        },
      });

      return { payment, pendingFee: updatedPending };
    });
  },

  // ─── STATS & REPORTS ───────────────────────────────────────────────────────
  async getFeeStats(instituteId: string) {
    const [payments, pendingFees] = await Promise.all([
      prisma.payment.findMany({ where: { instituteId } }),
      prisma.pendingFee.findMany({ where: { instituteId } }),
    ]);

    const totalCollected = payments
      .filter((p) => p.status === "SUCCESS")
      .reduce((sum, p) => sum + p.amount, 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const todayCollected = payments
      .filter((p) => p.status === "SUCCESS" && p.date.toISOString().split("T")[0] === todayStr)
      .reduce((sum, p) => sum + p.amount, 0);

    const digitalCount = payments.filter(
      (p) => p.method === "UPI" || p.method === "NET_BANKING" || p.method === "CARD"
    ).length;
    const digitalPercent = payments.length > 0 ? Math.round((digitalCount / payments.length) * 100) : 0;

    const totalPendingDues = pendingFees.reduce((sum, pf) => sum + pf.dueAmount, 0);
    const overdueItems = pendingFees.filter((pf) => pf.status === "OVERDUE");
    const overdueDues = overdueItems.reduce((sum, pf) => sum + pf.dueAmount, 0);
    const overdueCount = overdueItems.length;

    const avgOverdueDays =
      overdueCount > 0
        ? Math.round(overdueItems.reduce((sum, pf) => sum + pf.overdueDays, 0) / overdueCount)
        : 0;

    return {
      totalCollected,
      todayCollected,
      digitalPercent,
      totalTransactionsCount: payments.length,
      totalPendingDues,
      overdueDues,
      overdueCount,
      avgOverdueDays,
    };
  },

  async getFeeReports(instituteId: string) {
    const payments = await prisma.payment.findMany({
      where: { instituteId, status: "SUCCESS" },
    });

    const pendingFees = await prisma.pendingFee.findMany({
      where: { instituteId },
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const targetRevenue = 1500000;
    const targetAchievedPercent = Math.min(100, Math.round((totalCollected / targetRevenue) * 100));

    // Monthly revenue grouping
    const monthMap: Record<string, number> = {};
    for (const p of payments) {
      const monthYear = p.date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthMap[monthYear] = (monthMap[monthYear] || 0) + p.amount;
    }

    const monthlyRevenue = Object.entries(monthMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    // Course revenue grouping
    const courseMap: Record<string, number> = {};
    for (const p of payments) {
      courseMap[p.courseName] = (courseMap[p.courseName] || 0) + p.amount;
    }

    const colors = ["#1769AA", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];
    const courseRevenue = Object.entries(courseMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));

    // Payment mode distribution
    const modeMap: Record<string, { count: number; amount: number }> = {};
    for (const p of payments) {
      if (!modeMap[p.method]) {
        modeMap[p.method] = { count: 0, amount: 0 };
      }
      modeMap[p.method].count += 1;
      modeMap[p.method].amount += p.amount;
    }

    const paymentModeDistribution = Object.entries(modeMap).map(([mode, data]) => ({
      mode,
      count: data.count,
      amount: data.amount,
    }));

    // Due status summary
    const statusMap: Record<string, { count: number; totalAmount: number }> = {};
    for (const pf of pendingFees) {
      if (!statusMap[pf.status]) {
        statusMap[pf.status] = { count: 0, totalAmount: 0 };
      }
      statusMap[pf.status].count += 1;
      statusMap[pf.status].totalAmount += pf.dueAmount;
    }

    const dueStatusSummary = Object.entries(statusMap).map(([status, data]) => ({
      status,
      count: data.count,
      totalAmount: data.totalAmount,
    }));

    return {
      totalCollected,
      targetRevenue,
      targetAchievedPercent,
      monthlyRevenue,
      courseRevenue,
      paymentModeDistribution,
      dueStatusSummary,
    };
  },
};
