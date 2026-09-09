import { prisma } from "../../config/database";
import type {
  Prisma,
  PaymentStatus,
  OverdueStatus,
  PendingFee,
  Payment,
} from "@prisma/client";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
  BranchScopeParams,
} from "./fee.types";
import {
  applyAmountToPendingRow,
  applyFifoToPendingRows,
  derivePendingStatus,
  getIstDayBounds,
  overdueDaysFromDueDate,
  reverseAmountOnPendingRow,
  startOfDay,
  withDerivedPendingStatus,
} from "./fee-balance.util";

const applyBranchToWhere = <T extends Record<string, unknown>>(
  where: T,
  scope?: BranchScopeParams
): T => {
  if (!scope) return where;
  if (scope.branchId) {
    return { ...where, branchId: scope.branchId };
  }
  if (scope.branchIds && scope.branchIds.length > 0) {
    return { ...where, branchId: { in: scope.branchIds } };
  }
  return where;
};

export const FeeRepository = {
  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  async findPayments(
    instituteId: string,
    params: QueryPaymentsDTO & BranchScopeParams
  ) {
    const {
      search,
      method,
      paymentModeMasterId,
      status,
      page = 1,
      limit = 50,
      branchId,
      branchIds,
    } = params;

    const where: Prisma.PaymentWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(paymentModeMasterId ? { paymentModeMasterId } : {}),
        ...(method && method !== "ALL" && !paymentModeMasterId ? { method } : {}),
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
      },
      { branchId, branchIds }
    );

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

  async findPaymentsByStudent(
    instituteId: string,
    studentId: string,
    scope?: BranchScopeParams
  ) {
    const where = applyBranchToWhere(
      { instituteId, studentId },
      scope
    ) as Prisma.PaymentWhereInput;
    return prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
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
        studentName: dto.studentName || "",
        admissionNo: dto.admissionNo || "",
        courseName: dto.courseName || "",
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

  async recordFifoPayments(params: {
    instituteId: string;
    student: {
      id: string;
      name: string;
      admissionNo: string;
      courseName: string;
      branchId: string | null;
      admissionId: string | null;
    };
    openPending: PendingFee[];
    amount: number;
    masters: {
      method: string;
      paymentModeMasterId?: string;
      bankAccountMasterId?: string;
      feeHeadMasterId?: string;
      feeHead?: string;
    };
    dto: CreatePaymentDTO;
    receiptNumbers: string[];
    recordedById?: string;
  }): Promise<Payment[]> {
    const {
      instituteId,
      student,
      openPending,
      amount,
      masters,
      dto,
      receiptNumbers,
      recordedById,
    } = params;

    const { allocations, remainingUnapplied } = applyFifoToPendingRows(openPending, amount);
    if (allocations.length === 0) {
      // No open dues — orphan payment (no reverse on delete)
      const receiptNo = receiptNumbers[0];
      const payment = await prisma.payment.create({
        data: {
          receiptNo,
          instituteId,
          branchId: student.branchId,
          studentName: student.name,
          admissionNo: student.admissionNo,
          courseName: student.courseName,
          amount,
          date: dto.date ? new Date(dto.date) : new Date(),
          method: masters.method,
          paymentModeMasterId: masters.paymentModeMasterId || null,
          bankAccountMasterId: masters.bankAccountMasterId || null,
          feeHeadMasterId: masters.feeHeadMasterId || null,
          feeHead: masters.feeHead || null,
          transactionRef: dto.transactionRef || null,
          status: (dto.status as PaymentStatus) || "SUCCESS",
          notes: dto.notes || "Payment with no open installments",
          studentId: student.id,
          admissionId: student.admissionId,
          pendingFeeId: null,
          recordedById: recordedById || null,
        },
      });
      return [payment];
    }

    if (remainingUnapplied > 0) {
      throw new Error(
        `Payment amount exceeds open installment dues by ₹${remainingUnapplied.toFixed(2)}`
      );
    }

    return prisma.$transaction(async (tx) => {
      const payments: Payment[] = [];
      for (let i = 0; i < allocations.length; i++) {
        const alloc = allocations[i];
        const pending = alloc.row;
        const receiptNo = receiptNumbers[i];
        const payment = await tx.payment.create({
          data: {
            receiptNo,
            instituteId,
            branchId: pending.branchId ?? student.branchId,
            studentName: student.name,
            admissionNo: student.admissionNo,
            courseName: student.courseName,
            amount: alloc.applied,
            date: dto.date ? new Date(dto.date) : new Date(),
            method: masters.method,
            paymentModeMasterId: masters.paymentModeMasterId || null,
            bankAccountMasterId: masters.bankAccountMasterId || null,
            feeHeadMasterId: masters.feeHeadMasterId || pending.feeHeadMasterId || null,
            feeHead: masters.feeHead || pending.feeHead || null,
            transactionRef: dto.transactionRef || null,
            status: (dto.status as PaymentStatus) || "SUCCESS",
            notes:
              dto.notes ||
              `FIFO collection for Installment #${pending.installmentNo}`,
            studentId: student.id,
            admissionId: pending.admissionId ?? student.admissionId,
            pendingFeeId: pending.id,
            recordedById: recordedById || null,
          },
        });
        await tx.pendingFee.update({
          where: { id: pending.id },
          data: {
            amountPaid: alloc.amountPaid,
            dueAmount: alloc.dueAmount,
            status: alloc.status,
            overdueDays: alloc.overdueDays,
          },
        });
        payments.push(payment);
      }
      return payments;
    });
  },

  async deletePaymentWithReverse(id: string, instituteId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, instituteId },
      });
      if (!payment) return null;

      if (payment.pendingFeeId && payment.status === "SUCCESS") {
        const pending = await tx.pendingFee.findFirst({
          where: { id: payment.pendingFeeId, instituteId },
        });
        if (pending) {
          const reversed = reverseAmountOnPendingRow(pending, payment.amount);
          await tx.pendingFee.update({
            where: { id: pending.id },
            data: {
              amountPaid: reversed.amountPaid,
              dueAmount: reversed.dueAmount,
              status: reversed.status,
              overdueDays: reversed.overdueDays,
            },
          });
        }
      }

      await tx.payment.delete({ where: { id: payment.id } });
      return payment;
    });
  },

  // ─── PENDING FEES ──────────────────────────────────────────────────────────
  async findPendingFees(
    instituteId: string,
    params: QueryPendingFeesDTO & BranchScopeParams
  ) {
    const {
      search,
      status,
      studentId,
      page = 1,
      limit = 50,
      branchId,
      branchIds,
    } = params;

    const statusFilter =
      status && status !== "ALL"
        ? status === "UNPAID"
          ? { status: { in: ["OVERDUE", "DUE_SOON", "PARTIAL"] as OverdueStatus[] } }
          : { status: status as OverdueStatus }
        : {};

    const where: Prisma.PendingFeeWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(studentId ? { studentId } : {}),
        ...statusFilter,
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
      },
      { branchId, branchIds }
    );

    const [total, data] = await Promise.all([
      prisma.pendingFee.count({ where }),
      prisma.pendingFee.findMany({
        where,
        orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const today = startOfDay();
    const derived = data.map((row) => withDerivedPendingStatus(row, today));

    return { total, data: derived, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findPendingFeeById(id: string, instituteId: string) {
    return prisma.pendingFee.findFirst({
      where: { id, instituteId },
    });
  },

  async findOpenPendingFeesForStudent(
    instituteId: string,
    studentId: string,
    opts?: { admissionId?: string | null; courseName?: string | null }
  ) {
    return prisma.pendingFee.findMany({
      where: {
        instituteId,
        studentId,
        dueAmount: { gt: 0 },
        status: { not: "PAID" },
        ...(opts?.admissionId ? { admissionId: opts.admissionId } : {}),
        ...(opts?.courseName ? { courseName: opts.courseName } : {}),
      },
      orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }],
    });
  },

  async findPendingFeesByStudent(
    instituteId: string,
    studentId: string,
    scope?: BranchScopeParams
  ) {
    const where = applyBranchToWhere(
      { instituteId, studentId },
      scope
    ) as Prisma.PendingFeeWhereInput;
    const rows = await prisma.pendingFee.findMany({
      where,
      orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }],
    });
    const today = startOfDay();
    return rows.map((row) => withDerivedPendingStatus(row, today));
  },

  async recordPendingFeePayment(
    pendingItem: PendingFee,
    receiptNo: string,
    dto: CollectPendingFeeDTO,
    recordedById?: string
  ) {
    const applied = applyAmountToPendingRow(pendingItem, dto.amountPaidNow);
    if (applied.applied <= 0) {
      throw new Error("Nothing to collect on this installment");
    }
    if (applied.applied < dto.amountPaidNow) {
      throw new Error(
        `Amount paid (₹${dto.amountPaidNow}) exceeds due amount (₹${pendingItem.dueAmount})`
      );
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          instituteId: pendingItem.instituteId,
          branchId: pendingItem.branchId,
          studentName: pendingItem.studentName,
          admissionNo: pendingItem.admissionNo,
          courseName: pendingItem.courseName,
          amount: applied.applied,
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

      const updatedPending = await tx.pendingFee.update({
        where: { id: pendingItem.id },
        data: {
          amountPaid: applied.amountPaid,
          dueAmount: applied.dueAmount,
          status: applied.status,
          overdueDays: applied.overdueDays,
        },
      });

      return { payment, pendingFee: updatedPending };
    });
  },

  async syncPendingFeeStatuses(instituteId?: string) {
    const today = startOfDay();
    const rows = await prisma.pendingFee.findMany({
      where: {
        ...(instituteId ? { instituteId } : {}),
        status: { not: "PAID" },
        dueAmount: { gt: 0 },
      },
      take: 2000,
    });

    let updated = 0;
    for (const row of rows) {
      const status = derivePendingStatus(row.dueAmount, row.dueDate, row.amountPaid, today);
      const overdueDays = status === "OVERDUE" ? overdueDaysFromDueDate(row.dueDate, today) : 0;
      if (row.status !== status || row.overdueDays !== overdueDays) {
        await prisma.pendingFee.update({
          where: { id: row.id },
          data: { status, overdueDays },
        });
        updated += 1;
      }
    }
    return { scanned: rows.length, updated };
  },

  // ─── STATS & REPORTS ───────────────────────────────────────────────────────
  async getFeeStats(instituteId: string, scope?: BranchScopeParams) {
    const paymentWhere = applyBranchToWhere(
      { instituteId },
      scope
    ) as Prisma.PaymentWhereInput;
    const pendingWhere = applyBranchToWhere(
      { instituteId },
      scope
    ) as Prisma.PendingFeeWhereInput;

    const { start: todayStart, end: todayEnd } = getIstDayBounds();

    const [
      collectedAgg,
      todayAgg,
      paymentCount,
      digitalCount,
      pendingAgg,
      overdueAgg,
      overdueDaysAgg,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...paymentWhere, status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhere,
          status: "SUCCESS",
          date: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: paymentWhere }),
      prisma.payment.count({
        where: {
          ...paymentWhere,
          method: { in: ["UPI", "NET_BANKING", "CARD"] },
        },
      }),
      prisma.pendingFee.aggregate({
        where: { ...pendingWhere, dueAmount: { gt: 0 } },
        _sum: { dueAmount: true },
      }),
      prisma.pendingFee.aggregate({
        where: { ...pendingWhere, status: "OVERDUE", dueAmount: { gt: 0 } },
        _sum: { dueAmount: true },
        _count: true,
      }),
      prisma.pendingFee.aggregate({
        where: { ...pendingWhere, status: "OVERDUE", dueAmount: { gt: 0 } },
        _avg: { overdueDays: true },
      }),
    ]);

    const totalCollected = collectedAgg._sum.amount || 0;
    const todayCollected = todayAgg._sum.amount || 0;
    const digitalPercent =
      paymentCount > 0 ? Math.round((digitalCount / paymentCount) * 100) : 0;

    return {
      totalCollected,
      todayCollected,
      digitalPercent,
      totalTransactionsCount: paymentCount,
      totalPendingDues: pendingAgg._sum.dueAmount || 0,
      overdueDues: overdueAgg._sum.dueAmount || 0,
      overdueCount: overdueAgg._count || 0,
      avgOverdueDays: Math.round(overdueDaysAgg._avg.overdueDays || 0),
    };
  },

  async getFeeReports(instituteId: string, scope?: BranchScopeParams) {
    const paymentWhere = applyBranchToWhere(
      { instituteId, status: "SUCCESS" },
      scope
    ) as Prisma.PaymentWhereInput;
    const pendingWhere = applyBranchToWhere(
      { instituteId },
      scope
    ) as Prisma.PendingFeeWhereInput;

    const [payments, pendingAgg, dueStatusGroups, courseGroups, modeGroups] =
      await Promise.all([
        prisma.payment.findMany({
          where: paymentWhere,
          select: { amount: true, date: true, courseName: true, method: true },
        }),
        prisma.pendingFee.aggregate({
          where: { ...pendingWhere, dueAmount: { gt: 0 } },
          _sum: { dueAmount: true },
        }),
        prisma.pendingFee.groupBy({
          by: ["status"],
          where: pendingWhere,
          _count: { _all: true },
          _sum: { dueAmount: true },
        }),
        prisma.payment.groupBy({
          by: ["courseName"],
          where: paymentWhere,
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ["method"],
          where: paymentWhere,
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const openDues = pendingAgg._sum.dueAmount || 0;
    const targetRevenue = totalCollected + openDues;
    const targetAchievedPercent =
      targetRevenue > 0
        ? Math.min(100, Math.round((totalCollected / targetRevenue) * 100))
        : 0;

    const monthMap: Record<string, number> = {};
    for (const p of payments) {
      const monthYear = p.date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
      monthMap[monthYear] = (monthMap[monthYear] || 0) + p.amount;
    }
    const monthlyRevenue = Object.entries(monthMap).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    const colors = ["#1769AA", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];
    const courseRevenue = courseGroups.map((g, idx) => ({
      name: g.courseName,
      value: g._sum.amount || 0,
      color: colors[idx % colors.length],
    }));

    const paymentModeDistribution = modeGroups.map((g) => ({
      mode: g.method,
      count: g._count._all,
      amount: g._sum.amount || 0,
    }));

    const dueStatusSummary = dueStatusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
      totalAmount: g._sum.dueAmount || 0,
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

  // ─── FEE PLAN TEMPLATES ──────────────────────────────────────────────────────
  async findFeePlans(
    instituteId: string,
    params: {
      branchId?: string;
      branchIds?: string[];
      courseId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { branchId, branchIds, courseId, status, search, page = 1, limit = 20 } = params;
    const where: Prisma.FeePlanTemplateWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(courseId ? { courseId } : {}),
        ...(status ? { status: status as never } : { status: { not: "DELETED" } }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      { branchId, branchIds }
    );

    const [total, data] = await Promise.all([
      prisma.feePlanTemplate.count({ where }),
      prisma.feePlanTemplate.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findFeePlanById(id: string, instituteId: string) {
    return prisma.feePlanTemplate.findFirst({
      where: { id, instituteId },
      include: {
        course: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async createFeePlan(
    instituteId: string,
    data: {
      name: string;
      code?: string;
      branchId?: string;
      courseId?: string;
      totalAmount: number;
      planType?: string;
      installments?: unknown;
      description?: string;
    }
  ) {
    return prisma.feePlanTemplate.create({
      data: {
        instituteId,
        branchId: data.branchId || null,
        courseId: data.courseId || null,
        name: data.name,
        code: data.code,
        totalAmount: data.totalAmount,
        planType: (data.planType as never) || "FULL_PAYMENT",
        installments: data.installments as Prisma.InputJsonValue,
        description: data.description,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  },

  async updateFeePlan(id: string, instituteId: string, data: Prisma.FeePlanTemplateUpdateInput) {
    await prisma.feePlanTemplate.updateMany({ where: { id, instituteId }, data });
    return FeeRepository.findFeePlanById(id, instituteId);
  },

  async findReceipts(
    instituteId: string,
    params: {
      search?: string;
      branchId?: string;
      branchIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { search, branchId, branchIds, dateFrom, dateTo, page = 1, limit = 50 } = params;
    const where: Prisma.PaymentWhereInput = applyBranchToWhere(
      {
        instituteId,
        status: "SUCCESS",
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { receiptNo: { contains: search, mode: "insensitive" } },
                { studentName: { contains: search, mode: "insensitive" } },
                { admissionNo: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      { branchId, branchIds }
    );

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        select: {
          id: true,
          receiptNo: true,
          studentName: true,
          admissionNo: true,
          courseName: true,
          amount: true,
          date: true,
          method: true,
          status: true,
          transactionRef: true,
          branchId: true,
          createdAt: true,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, data, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

/** Apply a down-payment FIFO across newly created pending rows (shared by seeders). */
export async function fifoApplyDownPaymentToPending(
  tx: Prisma.TransactionClient,
  pendingRows: PendingFee[],
  downPayment: number
): Promise<void> {
  if (downPayment <= 0 || pendingRows.length === 0) return;
  const { allocations } = applyFifoToPendingRows(pendingRows, downPayment);
  for (const alloc of allocations) {
    if (!alloc.row.id) continue;
    await tx.pendingFee.update({
      where: { id: alloc.row.id },
      data: {
        amountPaid: alloc.amountPaid,
        dueAmount: alloc.dueAmount,
        status: alloc.status,
        overdueDays: alloc.overdueDays,
      },
    });
  }
}
