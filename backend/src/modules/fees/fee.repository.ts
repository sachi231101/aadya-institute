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
  PaymentAllocationInput,
  CreateChargesDTO,
} from "./fee.types";
import {
  applyAmountToPendingRow,
  applyFifoSameHeadOnly,
  derivePendingStatus,
  getIstDayBounds,
  overdueDaysFromDueDate,
  reverseAmountOnPendingRow,
  startOfDay,
  withDerivedPendingStatus,
} from "./fee-balance.util";
import {
  roundMoney,
  serializePayment,
  serializePendingFee,
  toMoneyNumber,
} from "./fee-money.util";
import { SequenceService } from "../masters/sequence.service";
import { AppError } from "../../middlewares/error.middleware";
import {
  issueStudentInvoiceForPendingFee,
  issueBundledStudentInvoice,
  linkAllocationToInvoice,
  syncInvoicesForPendingFeeIds,
  syncBundledInvoiceFromOtherInvoice,
} from "./fee-invoice.service";
import { enqueueReceiptPdfGeneration } from "./fee-receipt-pdf.service";
import { resolveTuitionFeeHead } from "./fee-provision.service";

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

const asBalanceRow = (p: PendingFee) => ({
  id: p.id,
  dueAmount: toMoneyNumber(p.dueAmount),
  amountPaid: toMoneyNumber(p.amountPaid),
  dueDate: p.dueDate,
  installmentNo: p.installmentNo,
  feeHeadMasterId: p.feeHeadMasterId,
});

export const FeeRepository = {
  async findPayments(
    instituteId: string,
    params: QueryPaymentsDTO & BranchScopeParams
  ) {
    const {
      search,
      method,
      paymentModeMasterId,
      feeHeadMasterId,
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
        ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
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
        include: {
          allocations: {
            include: {
              pendingFee: {
                select: {
                  id: true,
                  feeHead: true,
                  feeHeadMasterId: true,
                  installmentNo: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      data: data.map((p) => ({
        ...serializePayment(p as unknown as Record<string, unknown>),
        allocations: p.allocations.map((a) => ({
          ...a,
          amount: toMoneyNumber(a.amount),
        })),
      })),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findPaymentById(id: string, instituteId: string) {
    return prisma.payment.findFirst({
      where: { id, instituteId },
      include: { allocations: true },
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
    const rows = await prisma.payment.findMany({
      where,
      include: {
        allocations: {
          include: {
            pendingFee: {
              select: {
                id: true,
                feeHead: true,
                feeHeadMasterId: true,
                installmentNo: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return rows.map((p) => ({
      ...serializePayment(p as unknown as Record<string, unknown>),
      allocations: p.allocations.map((a) => ({
        ...a,
        amount: toMoneyNumber(a.amount),
      })),
    }));
  },

  /**
   * Record one payment with N allocations (one receipt).
   * Validates overpay; updates pending balances.
   */
  async recordAllocatedPayment(params: {
    instituteId: string;
    student: {
      id: string;
      name: string;
      admissionNo: string;
      courseName: string;
      branchId: string | null;
      admissionId: string | null;
    };
    amount: number;
    allocations: PaymentAllocationInput[];
    masters: {
      method: string;
      paymentModeMasterId?: string;
      bankAccountMasterId?: string;
      feeHeadMasterId?: string;
      feeHead?: string;
    };
    dto: Partial<CreatePaymentDTO>;
    recordedById?: string;
  }): Promise<Payment> {
    const { instituteId, student, amount, allocations, masters, dto, recordedById } =
      params;
    const totalAmount = roundMoney(amount);
    if (!allocations.length) {
      throw new AppError("Payment must allocate to at least one charge line", 400);
    }
    const allocSum = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
    if (Math.abs(allocSum - totalAmount) > 0.009) {
      throw new AppError(
        `Allocation total (₹${allocSum}) must equal payment amount (₹${totalAmount})`,
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      const pendingIds = allocations.map((a) => a.pendingFeeId);
      const pendingRows = await tx.pendingFee.findMany({
        where: {
          id: { in: pendingIds },
          instituteId,
          studentId: student.id,
        },
      });
      if (pendingRows.length !== pendingIds.length) {
        throw new AppError("One or more charge lines not found for this student", 404);
      }

      const byId = new Map(pendingRows.map((p) => [p.id, p]));
      for (const alloc of allocations) {
        const row = byId.get(alloc.pendingFeeId)!;
        const due = toMoneyNumber(row.dueAmount);
        if (roundMoney(alloc.amount) > due + 0.009) {
          throw new AppError(
            `Amount ₹${alloc.amount} exceeds due ₹${due} on charge ${row.feeHead || row.id}`,
            400
          );
        }
      }

      const receiptNo = await SequenceService.getNextNumber(instituteId, "RECEIPT");
      const primaryHead = byId.get(allocations[0].pendingFeeId);

      const payment = await tx.payment.create({
        data: {
          receiptNo,
          instituteId,
          branchId: student.branchId,
          studentId: student.id,
          admissionId: student.admissionId || dto.admissionId || null,
          studentName: student.name,
          admissionNo: student.admissionNo,
          courseName: student.courseName,
          amount: totalAmount,
          date: dto.date ? new Date(dto.date) : new Date(),
          method: masters.method,
          paymentModeMasterId: masters.paymentModeMasterId || null,
          bankAccountMasterId: masters.bankAccountMasterId || null,
          feeHeadMasterId:
            masters.feeHeadMasterId || primaryHead?.feeHeadMasterId || null,
          feeHead: masters.feeHead || primaryHead?.feeHead || null,
          transactionRef: dto.transactionRef || null,
          status: (dto.status as PaymentStatus) || "SUCCESS",
          notes: dto.notes || null,
          pendingFeeId: allocations.length === 1 ? allocations[0].pendingFeeId : null,
          recordedById: recordedById || null,
        },
      });

      if ((dto.status as PaymentStatus) === "PENDING" || (dto.status as PaymentStatus) === "FAILED") {
        return payment;
      }

      for (const alloc of allocations) {
        const row = byId.get(alloc.pendingFeeId)!;
        const applied = applyAmountToPendingRow(asBalanceRow(row), alloc.amount);
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            pendingFeeId: row.id,
            amount: applied.applied,
          },
        });
        await tx.pendingFee.update({
          where: { id: row.id },
          data: {
            amountPaid: applied.amountPaid,
            dueAmount: applied.dueAmount,
            status: applied.status,
            overdueDays: applied.overdueDays,
          },
        });
        await linkAllocationToInvoice(tx, payment.id, row.id);
      }

      await syncInvoicesForPendingFeeIds(
        tx,
        allocations.map((a) => a.pendingFeeId)
      );

      const otherInvoiceIds = [
        ...new Set(
          pendingRows
            .map((p) => p.otherInvoiceId)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      for (const oiId of otherInvoiceIds) {
        await syncBundledInvoiceFromOtherInvoice(tx, oiId);
      }

      enqueueReceiptPdfGeneration(payment.id);
      return payment;
    });
  },

  async recordFifoPayment(params: {
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
    preferredHeadId?: string | null;
    masters: {
      method: string;
      paymentModeMasterId?: string;
      bankAccountMasterId?: string;
      feeHeadMasterId?: string;
      feeHead?: string;
    };
    dto: CreatePaymentDTO;
    recordedById?: string;
  }): Promise<Payment> {
    const balanceRows = params.openPending.map(asBalanceRow);
    const { allocations, remainingUnapplied } = applyFifoSameHeadOnly(
      balanceRows,
      params.amount,
      params.preferredHeadId || params.masters.feeHeadMasterId
    );
    if (remainingUnapplied > 0.009) {
      throw new AppError(
        `Payment amount exceeds open dues by ₹${remainingUnapplied.toFixed(2)}`,
        400
      );
    }
    if (allocations.length === 0) {
      throw new AppError("No open dues to apply this payment to", 400);
    }
    return FeeRepository.recordAllocatedPayment({
      instituteId: params.instituteId,
      student: params.student,
      amount: params.amount,
      allocations: allocations.map((a) => ({
        pendingFeeId: a.row.id!,
        amount: a.applied,
      })),
      masters: params.masters,
      dto: params.dto,
      recordedById: params.recordedById,
    });
  },

  /** @deprecated Prefer recordAllocatedPayment / voidPayment */
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
    const payment = await FeeRepository.recordFifoPayment({
      ...params,
      preferredHeadId: params.masters.feeHeadMasterId,
    });
    return [payment];
  },

  async voidPayment(id: string, instituteId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, instituteId },
        include: { allocations: true },
      });
      if (!payment) return null;
      if (payment.status === "VOID") {
        throw new AppError("Payment is already voided", 400);
      }
      if (payment.status !== "SUCCESS") {
        await tx.payment.delete({ where: { id: payment.id } });
        return payment;
      }

      let allocations = payment.allocations;
      if (allocations.length === 0 && payment.pendingFeeId) {
        allocations = [
          {
            id: "legacy",
            paymentId: payment.id,
            pendingFeeId: payment.pendingFeeId,
            studentInvoiceId: null,
            amount: payment.amount,
            createdAt: payment.createdAt,
          },
        ];
      }

      for (const alloc of allocations) {
        const pending = await tx.pendingFee.findFirst({
          where: { id: alloc.pendingFeeId, instituteId },
        });
        if (!pending) continue;
        const reversed = reverseAmountOnPendingRow(
          asBalanceRow(pending),
          toMoneyNumber(alloc.amount)
        );
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

      const pendingFeeIds = allocations.map((a) => a.pendingFeeId);
      const otherInvoiceIds = [
        ...new Set(
          (
            await tx.pendingFee.findMany({
              where: { id: { in: pendingFeeIds } },
              select: { otherInvoiceId: true },
            })
          )
            .map((p) => p.otherInvoiceId)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (payment.allocations.length > 0) {
        await tx.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
      }

      await syncInvoicesForPendingFeeIds(tx, pendingFeeIds);
      for (const oiId of otherInvoiceIds) {
        await syncBundledInvoiceFromOtherInvoice(tx, oiId);
      }

      return tx.payment.update({
        where: { id: payment.id },
        data: { status: "VOID", notes: payment.notes ? `${payment.notes} [VOIDED]` : "VOIDED" },
      });
    });
  },

  async deletePaymentWithReverse(id: string, instituteId: string) {
    const existing = await prisma.payment.findFirst({ where: { id, instituteId } });
    if (!existing) return null;
    if (existing.status === "SUCCESS") {
      return FeeRepository.voidPayment(id, instituteId);
    }
    await prisma.payment.delete({ where: { id } });
    return existing;
  },

  async findPendingFees(
    instituteId: string,
    params: QueryPendingFeesDTO & BranchScopeParams
  ) {
    const {
      search,
      status,
      studentId,
      feeHeadMasterId,
      dueWithinDays,
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

    const today = startOfDay();
    let dueDateFilter: Prisma.DateTimeFilter | undefined;
    if (typeof dueWithinDays === "number" && dueWithinDays >= 0) {
      const end = new Date(today);
      end.setDate(end.getDate() + dueWithinDays);
      // Inclusive of today for dueWithinDays days: [today, today+N)
      dueDateFilter = { gte: today, lt: end };
    }

    const where: Prisma.PendingFeeWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(studentId ? { studentId } : {}),
        ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
        ...statusFilter,
        ...(dueDateFilter ||
        status === "UNPAID" ||
        status === "OVERDUE" ||
        status === "DUE_SOON" ||
        status === "PARTIAL"
          ? { dueAmount: { gt: 0 } }
          : {}),
        ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
        ...(search
          ? {
              OR: [
                { studentName: { contains: search, mode: "insensitive" } },
                { admissionNo: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { courseName: { contains: search, mode: "insensitive" } },
                { feeHead: { contains: search, mode: "insensitive" } },
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
        include: {
          feeHeadMaster: { select: { id: true, name: true, code: true } },
          studentInvoice: { select: { id: true, invoiceNo: true, status: true } },
        },
        orderBy: [{ dueDate: "asc" }, { installmentNo: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      data: data.map((row) => {
        const serialized = withDerivedPendingStatus(
          serializePendingFee(row as unknown as Record<string, unknown>) as never,
          today
        ) as Record<string, unknown>;
        return {
          ...serialized,
          invoiceNo: row.studentInvoice?.invoiceNo || null,
          invoiceId: row.studentInvoice?.id || null,
          invoiceStatus: row.studentInvoice?.status || null,
        };
      }),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findPendingFeeById(id: string, instituteId: string) {
    return prisma.pendingFee.findFirst({
      where: { id, instituteId },
    });
  },

  async findOpenPendingFeesForStudent(
    instituteId: string,
    studentId: string,
    opts?: { admissionId?: string | null; courseName?: string; feeHeadMasterId?: string }
  ) {
    return prisma.pendingFee.findMany({
      where: {
        instituteId,
        studentId,
        dueAmount: { gt: 0 },
        status: { not: "PAID" },
        ...(opts?.admissionId ? { admissionId: opts.admissionId } : {}),
        ...(opts?.feeHeadMasterId ? { feeHeadMasterId: opts.feeHeadMasterId } : {}),
      },
      orderBy: [{ feeHeadMasterId: "asc" }, { installmentNo: "asc" }, { dueDate: "asc" }],
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
      include: {
        feeHeadMaster: { select: { id: true, name: true, code: true } },
        studentInvoice: { select: { id: true, invoiceNo: true, status: true } },
      },
      orderBy: [{ feeHeadMasterId: "asc" }, { installmentNo: "asc" }, { dueDate: "asc" }],
    });
    const today = startOfDay();
    return rows.map((row) => {
      const serialized = withDerivedPendingStatus(
        serializePendingFee(row as unknown as Record<string, unknown>) as never,
        today
      ) as Record<string, unknown>;
      return {
        ...serialized,
        invoiceNo: row.studentInvoice?.invoiceNo || null,
        invoiceId: row.studentInvoice?.id || null,
        invoiceStatus: row.studentInvoice?.status || null,
      };
    });
  },

  async recordPendingFeePayment(
    pendingItem: PendingFee,
    _receiptNoIgnored: string,
    dto: CollectPendingFeeDTO,
    recordedById?: string
  ) {
    const due = toMoneyNumber(pendingItem.dueAmount);
    if (dto.amountPaidNow > due + 0.009) {
      throw new AppError(
        `Amount paid (₹${dto.amountPaidNow}) exceeds due amount (₹${due})`,
        400
      );
    }
    if (!pendingItem.studentId) {
      throw new AppError("Pending fee has no linked student", 400);
    }

    const payment = await FeeRepository.recordAllocatedPayment({
      instituteId: pendingItem.instituteId,
      student: {
        id: pendingItem.studentId,
        name: pendingItem.studentName,
        admissionNo: pendingItem.admissionNo,
        courseName: pendingItem.courseName,
        branchId: pendingItem.branchId,
        admissionId: pendingItem.admissionId,
      },
      amount: dto.amountPaidNow,
      allocations: [{ pendingFeeId: pendingItem.id, amount: dto.amountPaidNow }],
      masters: {
        method: dto.method || "UPI",
        paymentModeMasterId: dto.paymentModeMasterId,
        feeHeadMasterId: dto.feeHeadMasterId || pendingItem.feeHeadMasterId,
        feeHead: dto.feeHead || pendingItem.feeHead || undefined,
      },
      dto: { notes: dto.notes, transactionRef: dto.transactionRef },
      recordedById,
    });

    const updatedPending = await prisma.pendingFee.findUnique({ where: { id: pendingItem.id } });
    return {
      payment: serializePayment(payment as unknown as Record<string, unknown>),
      pendingFee: updatedPending
        ? serializePendingFee(updatedPending as unknown as Record<string, unknown>)
        : null,
    };
  },

  async createCharges(
    instituteId: string,
    student: {
      id: string;
      name: string;
      phone: string;
      admissionNo: string;
      courseName: string;
      branchId: string | null;
      admissionId: string | null;
    },
    dto: CreateChargesDTO
  ) {
    const heads = await prisma.masterRecord.findMany({
      where: {
        instituteId,
        entityType: "feeheads",
        id: { in: dto.charges.map((c) => c.feeHeadMasterId) },
      },
    });
    const headMap = new Map(heads.map((h) => [h.id, h]));

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const charge of dto.charges) {
        const head = headMap.get(charge.feeHeadMasterId);
        if (!head) throw new AppError(`Fee head not found: ${charge.feeHeadMasterId}`, 400);
        const amount = roundMoney(charge.amount);
        const dueDate = charge.dueDate ? new Date(charge.dueDate) : new Date();
        if (Number.isNaN(dueDate.getTime())) {
          throw new AppError("Invalid due date", 400);
        }
        const row = await tx.pendingFee.create({
          data: {
            instituteId,
            branchId: student.branchId,
            studentId: student.id,
            admissionId: dto.admissionId || student.admissionId,
            studentName: student.name,
            admissionNo: student.admissionNo,
            phone: student.phone || "",
            courseName: student.courseName,
            totalFee: amount,
            amountPaid: 0,
            dueAmount: amount,
            dueDate,
            installmentNo: charge.installmentNo || 1,
            status: "DUE_SOON",
            feeHeadMasterId: head.id,
            feeHead: head.name,
            notes: charge.notes || null,
          },
        });
        await issueStudentInvoiceForPendingFee(tx, row);
        rows.push(row);
      }
      return rows;
    });

    return created.map((r) => serializePendingFee(r as unknown as Record<string, unknown>));
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
      const dueAmount = toMoneyNumber(row.dueAmount);
      const amountPaid = toMoneyNumber(row.amountPaid);
      const status = derivePendingStatus(dueAmount, row.dueDate, amountPaid, today);
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

  async getFeeStats(instituteId: string, scope?: BranchScopeParams) {
    const paymentWhere = applyBranchToWhere(
      { instituteId, status: "SUCCESS" },
      scope
    ) as Prisma.PaymentWhereInput;
    const pendingWhere = applyBranchToWhere(
      { instituteId },
      scope
    ) as Prisma.PendingFeeWhereInput;

    const { start: todayStart, end: todayEnd } = getIstDayBounds();
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      collectedAgg,
      todayAgg,
      paymentCount,
      digitalCount,
      pendingAgg,
      overdueAgg,
      overdueDaysAgg,
      dueThisWeekAgg,
      byHeadPending,
      byHeadPaid,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhere,
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
      prisma.pendingFee.aggregate({
        where: {
          ...pendingWhere,
          dueAmount: { gt: 0 },
          dueDate: { gte: todayStart, lt: weekEnd },
        },
        _sum: { dueAmount: true },
        _count: true,
      }),
      prisma.pendingFee.groupBy({
        by: ["feeHeadMasterId", "feeHead"],
        where: { ...pendingWhere, dueAmount: { gt: 0 } },
        _sum: { dueAmount: true },
      }),
      prisma.payment.groupBy({
        by: ["feeHeadMasterId", "feeHead"],
        where: paymentWhere,
        _sum: { amount: true },
      }),
    ]);

    const headMap = new Map<
      string,
      { feeHead: string; feeHeadMasterId: string; collected: number; pending: number }
    >();
    for (const g of byHeadPaid) {
      const key = g.feeHeadMasterId || g.feeHead || "unknown";
      headMap.set(key, {
        feeHeadMasterId: g.feeHeadMasterId || "",
        feeHead: g.feeHead || "Unknown",
        collected: toMoneyNumber(g._sum.amount),
        pending: 0,
      });
    }
    for (const g of byHeadPending) {
      const key = g.feeHeadMasterId || g.feeHead || "unknown";
      const existing = headMap.get(key);
      if (existing) {
        existing.pending = toMoneyNumber(g._sum.dueAmount);
      } else {
        headMap.set(key, {
          feeHeadMasterId: g.feeHeadMasterId,
          feeHead: g.feeHead || "Unknown",
          collected: 0,
          pending: toMoneyNumber(g._sum.dueAmount),
        });
      }
    }

    return {
      totalCollected: toMoneyNumber(collectedAgg._sum.amount),
      todayCollected: toMoneyNumber(todayAgg._sum.amount),
      digitalPercent:
        paymentCount > 0 ? Math.round((digitalCount / paymentCount) * 100) : 0,
      totalTransactionsCount: paymentCount,
      totalPendingDues: toMoneyNumber(pendingAgg._sum.dueAmount),
      overdueDues: toMoneyNumber(overdueAgg._sum.dueAmount),
      overdueCount: overdueAgg._count || 0,
      avgOverdueDays: Math.round(overdueDaysAgg._avg.overdueDays || 0),
      dueThisWeek: toMoneyNumber(dueThisWeekAgg._sum.dueAmount),
      dueThisWeekCount: dueThisWeekAgg._count || 0,
      byFeeHead: Array.from(headMap.values()),
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

    const [payments, pendingAgg, dueStatusGroups, courseGroups, modeGroups, stats] =
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
          where: { ...pendingWhere, dueAmount: { gt: 0 } },
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
        FeeRepository.getFeeStats(instituteId, scope),
      ]);

    const totalCollected = payments.reduce((sum, p) => sum + toMoneyNumber(p.amount), 0);
    const openDues = toMoneyNumber(pendingAgg._sum.dueAmount);
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
      monthMap[monthYear] = (monthMap[monthYear] || 0) + toMoneyNumber(p.amount);
    }

    const colors = ["#1769AA", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];
    return {
      totalCollected,
      targetRevenue,
      targetAchievedPercent,
      outstandingDues: openDues,
      overdueDues: stats.overdueDues,
      overdueCount: stats.overdueCount,
      dueThisWeek: stats.dueThisWeek,
      dueThisWeekCount: stats.dueThisWeekCount,
      monthlyRevenue: Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })),
      courseRevenue: courseGroups.map((g, idx) => ({
        name: g.courseName,
        value: toMoneyNumber(g._sum.amount),
        color: colors[idx % colors.length],
      })),
      paymentModeDistribution: modeGroups.map((g) => ({
        mode: g.method,
        count: g._count._all,
        amount: toMoneyNumber(g._sum.amount),
      })),
      dueStatusSummary: dueStatusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
        totalAmount: toMoneyNumber(g._sum.dueAmount),
      })),
      byFeeHead: stats.byFeeHead,
    };
  },

  async findReceipts(
    instituteId: string,
    params: {
      search?: string;
      branchId?: string;
      branchIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      feeHeadMasterId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const {
      search,
      branchId,
      branchIds,
      dateFrom,
      dateTo,
      feeHeadMasterId,
      page = 1,
      limit = 50,
    } = params;
    const where: Prisma.PaymentWhereInput = applyBranchToWhere(
      {
        instituteId,
        status: { in: ["SUCCESS", "VOID"] },
        ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
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
          feeHead: true,
          feeHeadMasterId: true,
          branchId: true,
          studentId: true,
          receiptPdfUrl: true,
          receiptGeneratedAt: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      data: data.map((d) => serializePayment(d as unknown as Record<string, unknown>)),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findFeeStudents(
    instituteId: string,
    params: {
      search?: string;
      courseId?: string;
      batchId?: string;
      status?: string;
      page?: number;
      limit?: number;
      branchId?: string;
      branchIds?: string[];
    }
  ) {
    const {
      search,
      courseId,
      batchId,
      status,
      page = 1,
      limit = 20,
      branchId,
      branchIds,
    } = params;

    const studentWhere: Prisma.StudentWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(search
          ? {
              OR: [
                { studentCode: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { phone: { contains: search, mode: "insensitive" } } },
                { admissions: { some: { admissionNo: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
        ...(courseId
          ? { admissions: { some: { courseId } } }
          : {}),
        ...(batchId
          ? {
              OR: [
                { admissions: { some: { batchId } } },
                { batchEnrollments: { some: { batchId } } },
              ],
            }
          : {}),
      },
      { branchId, branchIds }
    );

    const [total, students] = await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.student.findMany({
        where: studentWhere,
        include: {
          user: { select: { name: true, phone: true, email: true } },
          admissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              course: { select: { id: true, name: true } },
              batch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const studentIds = students.map((s) => s.id);
    const [pendingAgg, paymentAgg, overdueCounts, nextDueRows] = await Promise.all([
      prisma.pendingFee.groupBy({
        by: ["studentId"],
        where: { instituteId, studentId: { in: studentIds } },
        _sum: { dueAmount: true, amountPaid: true },
      }),
      prisma.payment.groupBy({
        by: ["studentId"],
        where: { instituteId, studentId: { in: studentIds }, status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.pendingFee.groupBy({
        by: ["studentId"],
        where: {
          instituteId,
          studentId: { in: studentIds },
          dueAmount: { gt: 0 },
          dueDate: { lt: startOfDay() },
        },
        _count: { _all: true },
      }),
      prisma.pendingFee.groupBy({
        by: ["studentId"],
        where: {
          instituteId,
          studentId: { in: studentIds },
          dueAmount: { gt: 0 },
        },
        _min: { dueDate: true },
      }),
    ]);

    const pendingMap = new Map(
      pendingAgg.map((r) => [
        r.studentId || "",
        {
          due: toMoneyNumber(r._sum.dueAmount),
          paidFromCharges: toMoneyNumber(r._sum.amountPaid),
        },
      ])
    );
    const paidMap = new Map(
      paymentAgg.map((r) => [r.studentId || "", toMoneyNumber(r._sum.amount)])
    );
    const overdueMap = new Map(
      overdueCounts.map((r) => [r.studentId || "", r._count._all])
    );
    const nextDueMap = new Map(
      nextDueRows.map((r) => [r.studentId || "", r._min.dueDate?.toISOString() || null])
    );

    const todayStart = getIstDayBounds().start;
    const todayEnd = getIstDayBounds().end;
    const todayByStudent = await prisma.payment.groupBy({
      by: ["studentId"],
      where: {
        instituteId,
        studentId: { in: studentIds },
        status: "SUCCESS",
        date: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });
    const todayMap = new Map(
      todayByStudent.map((r) => [r.studentId || "", toMoneyNumber(r._sum.amount)])
    );

    let rows = students.map((s) => {
      const due = pendingMap.get(s.id)?.due || 0;
      const paid = paidMap.get(s.id) || 0;
      const paidFromCharges = pendingMap.get(s.id)?.paidFromCharges || 0;
      const totalFee = roundMoney(due + paidFromCharges);
      const overdueCount = overdueMap.get(s.id) || 0;
      let feeStatus: "Paid" | "Overdue" | "Partial" | "Pending" | "None" = "None";
      if (totalFee <= 0 && paid <= 0) feeStatus = "None";
      else if (due <= 0 && totalFee > 0) feeStatus = "Paid";
      else if (overdueCount > 0) feeStatus = "Overdue";
      else if (paid > 0 && due > 0) feeStatus = "Partial";
      else if (due > 0) feeStatus = "Pending";

      const admission = s.admissions[0];
      return {
        id: s.id,
        studentCode: s.studentCode,
        name: s.user?.name || "Student",
        phone: s.user?.phone || null,
        email: s.user?.email || null,
        branchId: s.branchId,
        courseId: admission?.course?.id || null,
        courseName: admission?.course?.name || null,
        batchId: admission?.batch?.id || null,
        batchName: admission?.batch?.name || null,
        admissionNo: admission?.admissionNo || null,
        totalFee,
        amountPaid: paid,
        balance: due,
        status: feeStatus,
        overdueCount,
        todayCollected: todayMap.get(s.id) || 0,
        nextDueDate: due > 0 ? nextDueMap.get(s.id) || null : null,
      };
    });

    if (status && status !== "ALL") {
      const wanted = status.toLowerCase();
      rows = rows.filter((r) => r.status.toLowerCase() === wanted);
    }

    // Workspace summary across filtered set (page-agnostic totals for cards use separate stats)
    return {
      total,
      data: rows,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findStudentInvoices(
    instituteId: string,
    params: {
      search?: string;
      status?: string;
      studentId?: string;
      page?: number;
      limit?: number;
      branchId?: string;
      branchIds?: string[];
    }
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

    const where: Prisma.StudentInvoiceWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(studentId ? { studentId } : {}),
        ...(status && status !== "ALL"
          ? { status: status as Prisma.EnumStudentInvoiceStatusFilter["equals"] }
          : {}),
        ...(search
          ? {
              OR: [
                { invoiceNo: { contains: search, mode: "insensitive" } },
                { studentName: { contains: search, mode: "insensitive" } },
                { admissionNo: { contains: search, mode: "insensitive" } },
                { courseName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      { branchId, branchIds }
    );

    const [total, data] = await Promise.all([
      prisma.studentInvoice.count({ where }),
      prisma.studentInvoice.findMany({
        where,
        include: {
          pendingFee: { select: { id: true, feeHead: true, installmentNo: true } },
          otherInvoice: { select: { id: true, invoiceNo: true } },
        },
        orderBy: { invoiceDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      data: data.map((d) => ({
        ...d,
        totalAmount: toMoneyNumber(d.totalAmount),
        amountPaid: toMoneyNumber(d.amountPaid),
        balance: toMoneyNumber(d.balance),
      })),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findStudentInvoiceById(id: string, instituteId: string) {
    const invoice = await prisma.studentInvoice.findFirst({
      where: { id, instituteId },
      include: {
        pendingFee: true,
        otherInvoice: { include: { items: { orderBy: { sortOrder: "asc" } } } },
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                receiptNo: true,
                amount: true,
                date: true,
                method: true,
                status: true,
                receiptPdfUrl: true,
              },
            },
          },
        },
      },
    });
    if (!invoice) return null;
    return {
      ...invoice,
      totalAmount: toMoneyNumber(invoice.totalAmount),
      amountPaid: toMoneyNumber(invoice.amountPaid),
      balance: toMoneyNumber(invoice.balance),
      pendingFee: invoice.pendingFee
        ? serializePendingFee(invoice.pendingFee as unknown as Record<string, unknown>)
        : null,
      allocations: invoice.allocations.map((a) => ({
        ...a,
        amount: toMoneyNumber(a.amount),
        payment: a.payment
          ? {
              ...a.payment,
              amount: toMoneyNumber(a.payment.amount),
            }
          : null,
      })),
    };
  },

  async cancelStudentInvoice(id: string, instituteId: string, reason?: string) {
    const invoice = await prisma.studentInvoice.findFirst({ where: { id, instituteId } });
    if (!invoice) return null;
    if (invoice.status === "CANCELLED") {
      throw new AppError("Invoice is already cancelled", 400);
    }
    if (toMoneyNumber(invoice.amountPaid) > 0) {
      throw new AppError("Cannot cancel an invoice with payments — void payments first", 400);
    }
    return prisma.studentInvoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });
  },

  async findOtherInvoices(
    instituteId: string,
    params: {
      search?: string;
      status?: string;
      studentId?: string;
      page?: number;
      limit?: number;
      branchId?: string;
      branchIds?: string[];
    }
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

    const where: Prisma.OtherInvoiceWhereInput = applyBranchToWhere(
      {
        instituteId,
        ...(studentId ? { studentId } : {}),
        ...(status && status !== "ALL"
          ? { status: status as Prisma.EnumOtherInvoiceStatusFilter["equals"] }
          : {}),
        ...(search
          ? {
              OR: [
                { invoiceNo: { contains: search, mode: "insensitive" } },
                { studentName: { contains: search, mode: "insensitive" } },
                { admissionNo: { contains: search, mode: "insensitive" } },
                { reference: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      { branchId, branchIds }
    );

    const [total, data] = await Promise.all([
      prisma.otherInvoice.count({ where }),
      prisma.otherInvoice.findMany({
        where,
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { invoiceDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      data: data.map((d) => ({
        ...d,
        subtotal: toMoneyNumber(d.subtotal),
        discount: toMoneyNumber(d.discount),
        tax: toMoneyNumber(d.tax),
        adjustments: toMoneyNumber(d.adjustments),
        grandTotal: toMoneyNumber(d.grandTotal),
        amountPaid: toMoneyNumber(d.amountPaid),
        balance: toMoneyNumber(d.balance),
        items: d.items.map((i) => ({
          ...i,
          quantity: toMoneyNumber(i.quantity),
          unitPrice: toMoneyNumber(i.unitPrice),
          discount: toMoneyNumber(i.discount),
          tax: toMoneyNumber(i.tax),
          taxPercent: toMoneyNumber(i.taxPercent),
          lineTotal: toMoneyNumber(i.lineTotal),
        })),
      })),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findOtherInvoiceById(id: string, instituteId: string) {
    const row = await prisma.otherInvoice.findFirst({
      where: { id, instituteId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        pendingFees: true,
        studentInvoices: true,
      },
    });
    if (!row) return null;
    return {
      ...row,
      subtotal: toMoneyNumber(row.subtotal),
      discount: toMoneyNumber(row.discount),
      tax: toMoneyNumber(row.tax),
      adjustments: toMoneyNumber(row.adjustments),
      grandTotal: toMoneyNumber(row.grandTotal),
      amountPaid: toMoneyNumber(row.amountPaid),
      balance: toMoneyNumber(row.balance),
      items: row.items.map((i) => ({
        ...i,
        quantity: toMoneyNumber(i.quantity),
        unitPrice: toMoneyNumber(i.unitPrice),
        discount: toMoneyNumber(i.discount),
        tax: toMoneyNumber(i.tax),
        taxPercent: toMoneyNumber(i.taxPercent),
        lineTotal: toMoneyNumber(i.lineTotal),
      })),
      pendingFees: row.pendingFees.map((p) =>
        serializePendingFee(p as unknown as Record<string, unknown>)
      ),
      studentInvoices: row.studentInvoices.map((i) => ({
        ...i,
        totalAmount: toMoneyNumber(i.totalAmount),
        amountPaid: toMoneyNumber(i.amountPaid),
        balance: toMoneyNumber(i.balance),
      })),
    };
  },

  async createOtherInvoice(
    instituteId: string,
    student: {
      id: string;
      name: string;
      phone: string;
      admissionNo: string;
      courseName: string;
      branchId: string | null;
      admissionId: string | null;
    },
    dto: {
      reference?: string;
      invoiceDate?: string;
      dueDate?: string;
      notes?: string;
      terms?: string;
      discount?: number;
      tax?: number;
      adjustments?: number;
      takenById?: string;
      takenByName?: string;
      items: Array<{
        name: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        discountType?: "FLAT" | "PERCENT";
        tax?: number;
        taxPercent?: number;
        feeHeadMasterId?: string;
      }>;
    }
  ) {
    const headIds = dto.items
      .map((i) => i.feeHeadMasterId)
      .filter((id): id is string => Boolean(id));
    const heads = headIds.length
      ? await prisma.masterRecord.findMany({
          where: { instituteId, entityType: "feeheads", id: { in: headIds } },
        })
      : [];
    const headMap = new Map(heads.map((h) => [h.id, h]));
    const tuition = await resolveTuitionFeeHead(prisma, instituteId);

    const createdId = await prisma.$transaction(async (tx) => {
      const computedItems = dto.items.map((item, idx) => {
        const qty = roundMoney(item.quantity || 1);
        const unit = roundMoney(item.unitPrice);
        const base = roundMoney(qty * unit);
        const discountType = item.discountType === "PERCENT" ? "PERCENT" : "FLAT";
        const rawDiscount = roundMoney(item.discount || 0);
        const disc =
          discountType === "PERCENT"
            ? roundMoney((base * rawDiscount) / 100)
            : rawDiscount;
        const taxable = roundMoney(Math.max(0, base - disc));
        const taxPercent = roundMoney(item.taxPercent || 0);
        const tax =
          taxPercent > 0
            ? roundMoney((taxable * taxPercent) / 100)
            : roundMoney(item.tax || 0);
        const lineTotal = roundMoney(taxable + tax);
        const head = item.feeHeadMasterId ? headMap.get(item.feeHeadMasterId) : null;
        return {
          name: item.name,
          description: item.description || null,
          quantity: qty,
          unitPrice: unit,
          discount: disc,
          discountType,
          tax,
          taxPercent,
          lineTotal,
          feeHeadMasterId: head?.id || tuition.id,
          feeHead: head?.name || item.name,
          sortOrder: idx,
        };
      });

      const subtotal = roundMoney(
        computedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      );
      const itemDiscount = roundMoney(computedItems.reduce((s, i) => s + i.discount, 0));
      const itemTax = roundMoney(computedItems.reduce((s, i) => s + i.tax, 0));
      const headerDiscount = roundMoney(dto.discount || 0);
      const headerTax = roundMoney(dto.tax || 0);
      const adjustments = roundMoney(dto.adjustments || 0);
      const discount = roundMoney(itemDiscount + headerDiscount);
      const tax = roundMoney(itemTax + headerTax);
      const grandTotal = roundMoney(subtotal - discount + tax + adjustments);
      if (grandTotal <= 0) {
        throw new AppError("Other invoice grand total must be positive", 400);
      }

      const invoiceNo = await SequenceService.getNextNumber(instituteId, "OTHER_INVOICE");
      const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : addDaysLocal(invoiceDate, 0);

      const other = await tx.otherInvoice.create({
        data: {
          invoiceNo,
          instituteId,
          branchId: student.branchId,
          studentId: student.id,
          admissionId: student.admissionId,
          studentName: student.name,
          admissionNo: student.admissionNo,
          courseName: student.courseName,
          reference: dto.reference || null,
          invoiceDate,
          dueDate,
          takenById: dto.takenById || null,
          takenByName: dto.takenByName || null,
          subtotal,
          discount,
          tax,
          adjustments,
          grandTotal,
          amountPaid: 0,
          balance: grandTotal,
          status: "ISSUED",
          terms: dto.terms || null,
          notes: dto.notes || null,
          items: {
            create: computedItems.map((i) => ({
              name: i.name,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              discountType: i.discountType,
              tax: i.tax,
              taxPercent: i.taxPercent,
              lineTotal: i.lineTotal,
              feeHeadMasterId: i.feeHeadMasterId,
              feeHead: i.feeHead,
              sortOrder: i.sortOrder,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of computedItems) {
        if (item.lineTotal <= 0) continue;
        await tx.pendingFee.create({
          data: {
            instituteId,
            branchId: student.branchId,
            studentId: student.id,
            admissionId: student.admissionId,
            studentName: student.name,
            admissionNo: student.admissionNo,
            phone: student.phone || "",
            courseName: student.courseName,
            totalFee: item.lineTotal,
            amountPaid: 0,
            dueAmount: item.lineTotal,
            dueDate,
            installmentNo: 1,
            status: "DUE_SOON",
            feeHeadMasterId: item.feeHeadMasterId,
            feeHead: item.feeHead,
            notes: `Other invoice ${invoiceNo}`,
            otherInvoiceId: other.id,
          },
        });
      }

      await issueBundledStudentInvoice(tx, {
        instituteId,
        branchId: student.branchId,
        studentId: student.id,
        admissionId: student.admissionId,
        otherInvoiceId: other.id,
        studentName: student.name,
        admissionNo: student.admissionNo,
        courseName: student.courseName,
        totalAmount: grandTotal,
        dueDate,
        lineItems: computedItems.map((i) => ({
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          tax: i.tax,
          lineTotal: i.lineTotal,
        })),
        notes: dto.notes || null,
      });

      return other.id;
    });

    return FeeRepository.findOtherInvoiceById(createdId, instituteId);
  },

  async findReceiptById(id: string, instituteId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id, instituteId },
      include: {
        allocations: {
          include: {
            pendingFee: { select: { feeHead: true, installmentNo: true } },
            studentInvoice: { select: { invoiceNo: true, id: true } },
          },
        },
      },
    });
    if (!payment) return null;
    return serializePayment(payment as unknown as Record<string, unknown>);
  },
};

function addDaysLocal(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Apply a down-payment FIFO across newly created pending rows (shared by seeders). */
export async function fifoApplyDownPaymentToPending(
  tx: Prisma.TransactionClient,
  pendingRows: PendingFee[],
  downPayment: number
): Promise<void> {
  if (downPayment <= 0 || pendingRows.length === 0) return;
  const { allocations } = applyFifoSameHeadOnly(
    pendingRows.map((p) => ({
      id: p.id,
      dueAmount: toMoneyNumber(p.dueAmount),
      amountPaid: toMoneyNumber(p.amountPaid),
      dueDate: p.dueDate,
      installmentNo: p.installmentNo,
      feeHeadMasterId: p.feeHeadMasterId,
    })),
    downPayment
  );
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
