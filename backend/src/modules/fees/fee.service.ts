import { FeeRepository } from "./fee.repository";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
  QueryReceiptsDTO,
  StudentFeeStatementSummary,
  CreateChargesDTO,
  CreateChargeDTO,
  QueryFeeStudentsDTO,
  QueryStudentInvoicesDTO,
  CreateOtherInvoiceDTO,
} from "./fee.types";
import { generateAndStoreReceiptPdf, resolveLocalReceiptPdfPath } from "./fee-receipt-pdf.service";
import { repairLegacyStudentInvoiceNumbers } from "./fee-invoice.service";
import { repairUnallocatedPayments } from "./fee-payment-repair.service";
import fs from "fs";
import { prisma } from "../../config/database";
import {
  assertBranchRecordAccess,
  getBranchScopeFilter,
} from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import { AppError } from "../../middlewares/error.middleware";
import {
  resolveOptionalMasterFields,
  resolveRequiredMasterFields,
} from "../masters/master-resolve.service";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { derivePendingStatus, startOfDay } from "./fee-balance.util";
import { roundMoney, serializePayment, toMoneyNumber } from "./fee-money.util";

async function resolvePaymentMasters(
  instituteId: string,
  dto: {
    paymentModeMasterId?: string;
    method?: string;
    bankAccountMasterId?: string;
    feeHeadMasterId?: string;
  },
  branchId?: string | null
) {
  let method = dto.method || "UPI";
  let paymentModeMasterId: string | undefined;
  let bankAccountMasterId: string | undefined;
  let feeHead: string | undefined;
  let feeHeadMasterId: string | undefined;

  if (dto.paymentModeMasterId) {
    const resolved = await resolveRequiredMasterFields({
      instituteId,
      entityType: "paymentmodes",
      masterRecordId: dto.paymentModeMasterId,
      branchId,
    });
    paymentModeMasterId = resolved.masterId;
    method = resolved.code || resolved.label;
  }

  if (dto.bankAccountMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "bankaccounts",
      masterRecordId: dto.bankAccountMasterId,
      branchId,
    });
    bankAccountMasterId = resolved?.masterId;
  }

  if (dto.feeHeadMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "feeheads",
      masterRecordId: dto.feeHeadMasterId,
      branchId,
    });
    feeHeadMasterId = resolved?.masterId;
    feeHead = resolved?.label;
  }

  return { method, paymentModeMasterId, bankAccountMasterId, feeHead, feeHeadMasterId };
}

const scopeParams = (currentUser: AuthUser, requestedBranchId?: string) => {
  const scope = getBranchScopeFilter(currentUser, requestedBranchId);
  return {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    branchIds: scope.branchIds,
  };
};

const summarizeStudentFees = (
  payments: Array<{ status: string; amount: number }>,
  pendingFees: Array<{
    dueAmount: number;
    amountPaid: number;
    dueDate: Date | string;
    totalFee: number;
    status: string;
    feeHeadMasterId?: string;
    feeHead?: string | null;
  }>,
  concessionAmount = 0
): StudentFeeStatementSummary => {
  const amountPaid = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const dueAmount = pendingFees.reduce((sum, f) => sum + Math.max(0, f.dueAmount || 0), 0);

  const byHeadMap = new Map<
    string,
    { feeHeadMasterId: string; feeHead: string; totalFee: number; amountPaid: number; dueAmount: number }
  >();
  for (const f of pendingFees) {
    const key = f.feeHeadMasterId || f.feeHead || "unknown";
    const existing = byHeadMap.get(key) || {
      feeHeadMasterId: f.feeHeadMasterId || "",
      feeHead: f.feeHead || "Fee",
      totalFee: 0,
      amountPaid: 0,
      dueAmount: 0,
    };
    // Each pending row is one installment/charge — sum paid + remaining due for head total
    existing.amountPaid += f.amountPaid || 0;
    existing.dueAmount += Math.max(0, f.dueAmount || 0);
    existing.totalFee = roundMoney(
      existing.totalFee + (f.amountPaid || 0) + Math.max(0, f.dueAmount || 0)
    );
    byHeadMap.set(key, existing);
  }
  const byFeeHead = Array.from(byHeadMap.values());
  const netPayable = byFeeHead.reduce((s, h) => s + h.totalFee, 0);
  const totalFee = roundMoney(netPayable + concessionAmount);

  const today = startOfDay();
  const hasOverdue = pendingFees.some(
    (f) =>
      f.dueAmount > 0 &&
      derivePendingStatus(f.dueAmount, f.dueDate, f.amountPaid, today) === "OVERDUE"
  );
  const hasPartial = pendingFees.some((f) => f.dueAmount > 0 && f.amountPaid > 0);
  let status: StudentFeeStatementSummary["status"] = "Pending";
  if (dueAmount <= 0 && netPayable > 0) status = "Paid";
  else if (hasOverdue) status = "Overdue";
  else if (hasPartial || (amountPaid > 0 && dueAmount > 0)) status = "Partial";
  else if (dueAmount > 0) status = "Pending";

  const nextDue = pendingFees.find((f) => f.dueAmount > 0);
  return {
    totalFee,
    concessionAmount,
    netPayable,
    amountPaid,
    dueAmount,
    status,
    nextDueDate: nextDue?.dueDate ? new Date(nextDue.dueDate).toISOString() : undefined,
    byFeeHead,
  };
};

const maybeSendPaymentConfirmation = async (params: {
  instituteId: string;
  studentId: string;
  studentName: string;
  courseName: string;
  paymentId: string;
  amount: number;
  receiptNo: string;
  enabled?: boolean;
}) => {
  if (params.enabled === false) return;
  void triggerNotification({
    instituteId: params.instituteId,
    studentId: params.studentId,
    event: NotificationEvent.PAYMENT_CONFIRMATION,
    idempotencyKey: buildIdempotencyKey.PAYMENT_CONFIRMATION(
      params.studentId,
      params.paymentId
    ),
    templateParams: {
      student_name: params.studentName,
      amount: String(params.amount),
      receipt_no: params.receiptNo,
      course_name: params.courseName || "Course",
    },
    metadata: { paymentId: params.paymentId },
  }).catch(() => {});
};

export const FeeService = {
  async getPayments(currentUser: AuthUser, query: QueryPaymentsDTO) {
    const scope = scopeParams(currentUser, query.branchId);
    return FeeRepository.findPayments(scope.instituteId, {
      ...query,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async createPayment(currentUser: AuthUser, dto: CreatePaymentDTO, recordedById?: string) {
    const student = await prisma.student.findFirst({
      where: { id: dto.studentId, instituteId: currentUser.instituteId },
      include: {
        user: { select: { name: true } },
        admissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { course: { select: { name: true } } },
        },
      },
    });
    if (!student) throw new AppError("Student not found", 404);
    assertBranchRecordAccess(currentUser, student.branchId);

    const admission = student.admissions[0];
    const studentName = student.user?.name || dto.studentName || "Student";
    const admissionNo = admission?.admissionNo || dto.admissionNo || student.studentCode;
    const courseName = admission?.course?.name || dto.courseName || "Enrolled Course";
    const admissionId = dto.admissionId || admission?.id || null;
    const branchId = student.branchId;
    const totalAmount = roundMoney(dto.amount + (dto.lateFee || 0));
    const masters = await resolvePaymentMasters(currentUser.instituteId, dto, branchId);

    const studentCtx = {
      id: student.id,
      name: studentName,
      admissionNo,
      courseName,
      branchId,
      admissionId,
    };

    // Explicit multi-charge allocations
    if (dto.allocations && dto.allocations.length > 0) {
      const payment = await FeeRepository.recordAllocatedPayment({
        instituteId: currentUser.instituteId,
        student: studentCtx,
        amount: totalAmount,
        allocations: dto.allocations,
        masters,
        dto: { ...dto, amount: totalAmount },
        recordedById,
      });
      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: student.id,
        studentName,
        courseName,
        paymentId: payment.id,
        amount: toMoneyNumber(payment.amount),
        receiptNo: payment.receiptNo,
        enabled: dto.sendWhatsAppReceipt,
      });
      return serializePayment(payment as unknown as Record<string, unknown>);
    }

    // Targeted single charge
    if (dto.pendingFeeId) {
      const pendingItem = await FeeRepository.findPendingFeeById(
        dto.pendingFeeId,
        currentUser.instituteId
      );
      if (!pendingItem) throw new AppError("Pending fee record not found", 404);
      assertBranchRecordAccess(currentUser, pendingItem.branchId);
      if (pendingItem.studentId !== student.id) {
        throw new AppError("Pending fee does not belong to this student", 400);
      }
      const due = toMoneyNumber(pendingItem.dueAmount);
      if (totalAmount > due + 0.009) {
        throw new AppError(
          `Amount paid (₹${totalAmount}) exceeds due amount (₹${due})`,
          400
        );
      }

      const payment = await FeeRepository.recordAllocatedPayment({
        instituteId: currentUser.instituteId,
        student: studentCtx,
        amount: totalAmount,
        allocations: [{ pendingFeeId: pendingItem.id, amount: totalAmount }],
        masters: {
          ...masters,
          feeHeadMasterId: masters.feeHeadMasterId ?? pendingItem.feeHeadMasterId,
          feeHead: masters.feeHead ?? pendingItem.feeHead ?? undefined,
        },
        dto: { ...dto, amount: totalAmount },
        recordedById,
      });

      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: student.id,
        studentName,
        courseName: pendingItem.courseName,
        paymentId: payment.id,
        amount: toMoneyNumber(payment.amount),
        receiptNo: payment.receiptNo,
        enabled: dto.sendWhatsAppReceipt,
      });
      return serializePayment(payment as unknown as Record<string, unknown>);
    }

    // Same-head FIFO across open dues
    const openPending = await FeeRepository.findOpenPendingFeesForStudent(
      currentUser.instituteId,
      student.id,
      { admissionId: admissionId || undefined, feeHeadMasterId: masters.feeHeadMasterId }
    );

    const payment = await FeeRepository.recordFifoPayment({
      instituteId: currentUser.instituteId,
      student: studentCtx,
      openPending,
      amount: totalAmount,
      preferredHeadId: masters.feeHeadMasterId,
      masters,
      dto: { ...dto, amount: totalAmount },
      recordedById,
    });

    if (dto.sendWhatsAppReceipt !== false) {
      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: student.id,
        studentName,
        courseName,
        paymentId: payment.id,
        amount: toMoneyNumber(payment.amount),
        receiptNo: payment.receiptNo,
        enabled: dto.sendWhatsAppReceipt,
      });
    }

    return serializePayment(payment as unknown as Record<string, unknown>);
  },

  async voidPayment(currentUser: AuthUser, id: string) {
    const existing = await FeeRepository.findPaymentById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Payment record not found", 404);
    assertBranchRecordAccess(currentUser, existing.branchId);
    const voided = await FeeRepository.voidPayment(id, currentUser.instituteId);
    return serializePayment((voided || existing) as unknown as Record<string, unknown>);
  },

  async deletePayment(currentUser: AuthUser, id: string) {
    const existing = await FeeRepository.findPaymentById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Payment record not found", 404);
    assertBranchRecordAccess(currentUser, existing.branchId);
    const result = await FeeRepository.deletePaymentWithReverse(id, currentUser.instituteId);
    return { id, status: result?.status === "VOID" ? "VOID" : "DELETED" };
  },

  async getPendingFees(currentUser: AuthUser, query: QueryPendingFeesDTO) {
    const scope = scopeParams(currentUser, query.branchId);
    // One-time legacy heal: SUCCESS receipts without allocations + inflated installment groups
    await repairUnallocatedPayments(scope.instituteId).catch(() => undefined);
    return FeeRepository.findPendingFees(scope.instituteId, {
      ...query,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async collectPendingFee(
    currentUser: AuthUser,
    pendingFeeId: string,
    dto: CollectPendingFeeDTO,
    recordedById?: string
  ) {
    const pendingItem = await FeeRepository.findPendingFeeById(
      pendingFeeId,
      currentUser.instituteId
    );
    if (!pendingItem) throw new AppError("Pending fee record not found", 404);
    assertBranchRecordAccess(currentUser, pendingItem.branchId);

    const due = toMoneyNumber(pendingItem.dueAmount);
    if (dto.amountPaidNow > due + 0.009) {
      throw new AppError(
        `Amount paid (₹${dto.amountPaidNow}) exceeds due amount (₹${due})`,
        400
      );
    }

    const masters = await resolvePaymentMasters(
      currentUser.instituteId,
      dto,
      pendingItem.branchId
    );

    const result = await FeeRepository.recordPendingFeePayment(
      pendingItem,
      "",
      {
        ...dto,
        method: masters.method,
        paymentModeMasterId: masters.paymentModeMasterId,
        feeHeadMasterId: masters.feeHeadMasterId ?? pendingItem.feeHeadMasterId,
        feeHead: masters.feeHead ?? pendingItem.feeHead ?? undefined,
      },
      recordedById
    );

    if (pendingItem.studentId && result.payment) {
      const payment = result.payment as unknown as {
        id: string;
        amount: unknown;
        receiptNo: string;
      };
      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: pendingItem.studentId,
        studentName: pendingItem.studentName,
        courseName: pendingItem.courseName,
        paymentId: payment.id,
        amount: toMoneyNumber(payment.amount),
        receiptNo: payment.receiptNo,
      });
    }

    return result;
  },

  async createCharges(currentUser: AuthUser, dto: CreateChargesDTO) {
    const student = await prisma.student.findFirst({
      where: { id: dto.studentId, instituteId: currentUser.instituteId },
      include: {
        user: { select: { name: true, phone: true } },
        admissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { course: { select: { name: true } } },
        },
      },
    });
    if (!student) throw new AppError("Student not found", 404);
    assertBranchRecordAccess(currentUser, student.branchId);

    const admission = student.admissions[0];
    return FeeRepository.createCharges(
      currentUser.instituteId,
      {
        id: student.id,
        name: student.user?.name || "Student",
        phone: student.user?.phone || "",
        admissionNo: admission?.admissionNo || student.studentCode,
        courseName: admission?.course?.name || "Course",
        branchId: student.branchId,
        admissionId: dto.admissionId || admission?.id || null,
      },
      dto
    );
  },

  async createCharge(currentUser: AuthUser, dto: CreateChargeDTO) {
    return FeeService.createCharges(currentUser, {
      studentId: dto.studentId,
      admissionId: dto.admissionId,
      charges: [
        {
          feeHeadMasterId: dto.feeHeadMasterId,
          amount: dto.amount,
          dueDate: dto.dueDate,
          installmentNo: dto.installmentNo,
          notes: dto.notes,
        },
      ],
    });
  },

  async sendFeeReminder(currentUser: AuthUser, pendingFeeId: string) {
    const pendingItem = await FeeRepository.findPendingFeeById(
      pendingFeeId,
      currentUser.instituteId
    );
    if (!pendingItem) throw new AppError("Pending fee record not found", 404);
    assertBranchRecordAccess(currentUser, pendingItem.branchId);
    if (!pendingItem.studentId) {
      throw new AppError("Pending fee has no linked student", 400);
    }
    if (toMoneyNumber(pendingItem.dueAmount) <= 0) {
      throw new AppError("This charge is already paid", 400);
    }

    const due = new Date(pendingItem.dueDate);
    const startOfToday = startOfDay();
    const isOverdue = due < startOfToday;
    const event = isOverdue
      ? NotificationEvent.FEE_OVERDUE_REMINDER
      : NotificationEvent.FEE_DUE_REMINDER;
    const dateKey = startOfToday.toISOString().slice(0, 10);
    const feeLabel = pendingItem.feeHead || "Fee";

    const notification = await triggerNotification({
      instituteId: currentUser.instituteId,
      studentId: pendingItem.studentId,
      event,
      idempotencyKey:
        event === NotificationEvent.FEE_OVERDUE_REMINDER
          ? buildIdempotencyKey.FEE_OVERDUE_REMINDER(
              pendingItem.studentId,
              pendingItem.id,
              `manual-${dateKey}`
            )
          : buildIdempotencyKey.FEE_DUE_REMINDER(
              pendingItem.studentId,
              pendingItem.id,
              `manual-${dateKey}`
            ),
      templateParams: {
        student_name: pendingItem.studentName,
        amount: String(toMoneyNumber(pendingItem.dueAmount)),
        due_date: due.toLocaleDateString("en-IN"),
        course_name: pendingItem.courseName ?? "Course",
        fee_head: feeLabel,
      },
      metadata: { pendingFeeId: pendingItem.id, manual: true, feeHead: feeLabel },
    });

    return {
      message:
        notification?.status === "SKIPPED"
          ? notification.skipReason === "INVALID_PHONE"
            ? `Reminder skipped — student has no valid WhatsApp phone (${pendingItem.phone || "missing"})`
            : `Reminder skipped (${notification.skipReason})`
          : `WhatsApp reminder queued for ${pendingItem.phone}`,
      notificationId: notification?.id ?? null,
      status: notification?.status ?? "SKIPPED",
      skipReason: notification?.skipReason ?? null,
      studentName: pendingItem.studentName,
      phone: pendingItem.phone,
      feeHead: feeLabel,
    };
  },

  async getFeeStats(currentUser: AuthUser, branchId?: string) {
    const scope = scopeParams(currentUser, branchId);
    return FeeRepository.getFeeStats(scope.instituteId, {
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async getFeeReports(currentUser: AuthUser, branchId?: string) {
    const scope = scopeParams(currentUser, branchId);
    return FeeRepository.getFeeReports(scope.instituteId, {
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async getStudentFeeStatement(currentUser: AuthUser, studentId: string) {
    const isStudent = currentUser.roles?.includes("STUDENT");
    // Students may only view their own statement
    if (isStudent) {
      const selfId =
        currentUser.studentId ||
        (
          await prisma.student.findFirst({
            where: { userId: currentUser.userId || currentUser.id, instituteId: currentUser.instituteId },
            select: { id: true },
          })
        )?.id;
      if (!selfId || selfId !== studentId) {
        throw new AppError("Forbidden — students can only view their own fees", 403);
      }
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: currentUser.instituteId },
      include: {
        user: { select: { name: true, phone: true } },
        admissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { concessionHeadMaster: { select: { id: true, name: true, data: true } } },
        },
      },
    });
    if (!student) throw new AppError("Student not found", 404);
    if (!isStudent) {
      assertBranchRecordAccess(currentUser, student.branchId);
    }

    await repairUnallocatedPayments(currentUser.instituteId).catch(() => undefined);

    const scope = scopeParams(currentUser);
    const [payments, pendingFees, invoices] = await Promise.all([
      FeeRepository.findPaymentsByStudent(currentUser.instituteId, studentId, {
        branchId: scope.branchId,
        branchIds: scope.branchIds,
      }),
      FeeRepository.findPendingFeesByStudent(currentUser.instituteId, studentId, {
        branchId: scope.branchId,
        branchIds: scope.branchIds,
      }),
      FeeRepository.findStudentInvoices(currentUser.instituteId, {
        studentId,
        branchId: scope.branchId,
        branchIds: scope.branchIds,
        page: 1,
        limit: 100,
      }),
    ]);

    // Best-effort concession from master percentage metadata (display only)
    let concessionAmount = 0;
    const concession = student.admissions[0]?.concessionHeadMaster;
    const pendingRows = pendingFees as Array<{
      amountPaid?: number;
      dueAmount?: number;
      feeHeadMasterId?: string;
      feeHead?: string | null;
    }>;
    if (concession?.data && typeof concession.data === "object") {
      const pct = Number((concession.data as { percentage?: string }).percentage);
      const net = pendingRows.reduce(
        (s, f) => s + (f.amountPaid || 0) + Math.max(0, f.dueAmount || 0),
        0
      );
      if (Number.isFinite(pct) && pct > 0 && pct < 100) {
        concessionAmount = roundMoney(net / (1 - pct / 100) - net);
      }
    }

    const paymentRows = payments as unknown as Array<{ status: string; amount: number }>;
    const summary = summarizeStudentFees(paymentRows, pendingRows as never, concessionAmount);

    const grouped = summary.byFeeHead.map((h) => ({
      ...h,
      charges: pendingRows.filter(
        (p) =>
          (p.feeHeadMasterId || "") === h.feeHeadMasterId ||
          (p.feeHead || "Fee") === h.feeHead
      ),
    }));

    const receipts = paymentRows.filter((p) => p.status === "SUCCESS");

    return {
      student: {
        id: student.id,
        name: student.user?.name || "Student",
        phone: student.user?.phone || null,
        studentCode: student.studentCode,
        branchId: student.branchId,
      },
      payments,
      pendingFees,
      invoices: invoices.data,
      receipts,
      byFeeHead: grouped,
      summary,
    };
  },

  async listFeeStudents(currentUser: AuthUser, query: QueryFeeStudentsDTO) {
    const scope = scopeParams(currentUser, query.branchId);
    return FeeRepository.findFeeStudents(scope.instituteId, {
      ...query,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async listStudentInvoices(currentUser: AuthUser, query: QueryStudentInvoicesDTO) {
    const scope = scopeParams(currentUser, query.branchId);
    // Rewrite migration INV-LEGACY-* numbers to Master Numbering Series (INVOICE) once per process
    await repairLegacyStudentInvoiceNumbers(scope.instituteId).catch(() => undefined);
    return FeeRepository.findStudentInvoices(scope.instituteId, {
      ...query,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async getStudentInvoice(currentUser: AuthUser, id: string) {
    const invoice = await FeeRepository.findStudentInvoiceById(id, currentUser.instituteId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    assertBranchRecordAccess(currentUser, invoice.branchId);
    return invoice;
  },

  async cancelStudentInvoice(currentUser: AuthUser, id: string, reason?: string) {
    const existing = await FeeRepository.findStudentInvoiceById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Invoice not found", 404);
    assertBranchRecordAccess(currentUser, existing.branchId);
    return FeeRepository.cancelStudentInvoice(id, currentUser.instituteId, reason);
  },

  async listOtherInvoices(currentUser: AuthUser, query: QueryStudentInvoicesDTO) {
    const scope = scopeParams(currentUser, query.branchId);
    return FeeRepository.findOtherInvoices(scope.instituteId, {
      ...query,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
    });
  },

  async getOtherInvoice(currentUser: AuthUser, id: string) {
    const invoice = await FeeRepository.findOtherInvoiceById(id, currentUser.instituteId);
    if (!invoice) throw new AppError("Other invoice not found", 404);
    assertBranchRecordAccess(currentUser, invoice.branchId);
    return invoice;
  },

  async createOtherInvoice(
    currentUser: AuthUser,
    dto: CreateOtherInvoiceDTO,
    takenBy?: { id?: string; name?: string }
  ) {
    const student = await prisma.student.findFirst({
      where: { id: dto.studentId, instituteId: currentUser.instituteId },
      include: {
        user: { select: { name: true, phone: true } },
        admissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { course: { select: { name: true } } },
        },
      },
    });
    if (!student) throw new AppError("Student not found", 404);
    assertBranchRecordAccess(currentUser, student.branchId);

    const admission = student.admissions[0];
    const invoice = await FeeRepository.createOtherInvoice(
      currentUser.instituteId,
      {
        id: student.id,
        name: student.user?.name || "Student",
        phone: student.user?.phone || "",
        admissionNo: admission?.admissionNo || student.studentCode,
        courseName: admission?.course?.name || "Course",
        branchId: student.branchId,
        admissionId: admission?.id || null,
      },
      {
        ...dto,
        takenById: takenBy?.id,
        takenByName: dto.takenByName || takenBy?.name,
      }
    );

    if (!invoice) throw new AppError("Failed to create other invoice", 500);

    // Optional same-screen payment against newly created charges
    if (dto.payment && dto.payment.amount > 0) {
      const pending = (invoice.pendingFees || []) as Array<{
        id: string;
        dueAmount: number;
      }>;
      const open = pending.filter((p) => (p.dueAmount || 0) > 0);
      if (open.length === 0) {
        throw new AppError("Invoice created but no open charges to allocate payment", 400);
      }

      let remaining = roundMoney(dto.payment.amount);
      const allocations: Array<{ pendingFeeId: string; amount: number }> = [];
      for (const row of open) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, roundMoney(row.dueAmount));
        if (apply <= 0) continue;
        allocations.push({ pendingFeeId: row.id, amount: apply });
        remaining = roundMoney(remaining - apply);
      }
      if (allocations.length === 0) {
        throw new AppError("Payment amount could not be allocated to invoice charges", 400);
      }

      const paidAmount = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
      const noteParts = [
        dto.payment.narration,
        dto.payment.transactionStatus
          ? `Txn status: ${dto.payment.transactionStatus}`
          : null,
        dto.payment.tds ? `TDS: ${dto.payment.tds}` : null,
        `Other invoice ${invoice.invoiceNo}`,
      ].filter(Boolean);

      await FeeService.createPayment(
        currentUser,
        {
          studentId: student.id,
          amount: paidAmount,
          date: dto.payment.transactionDate || dto.invoiceDate,
          paymentModeMasterId: dto.payment.paymentModeMasterId,
          method: dto.payment.method,
          bankAccountMasterId: dto.payment.bankAccountMasterId,
          transactionRef: dto.payment.transactionRef,
          notes: noteParts.join(" | ") || undefined,
          allocations,
          sendWhatsAppReceipt: true,
        },
        takenBy?.id
      );

      return FeeRepository.findOtherInvoiceById(invoice.id, currentUser.instituteId);
    }

    return invoice;
  },

  async getReceipt(currentUser: AuthUser, id: string) {
    const receipt = await FeeRepository.findReceiptById(id, currentUser.instituteId);
    if (!receipt) throw new AppError("Receipt not found", 404);
    assertBranchRecordAccess(currentUser, (receipt as { branchId?: string | null }).branchId);
    const pdfUrl = (receipt as { receiptPdfUrl?: string | null }).receiptPdfUrl;
    const pdfReady =
      (receipt as { status?: string }).status === "SUCCESS" &&
      !!pdfUrl &&
      !!resolveLocalReceiptPdfPath(pdfUrl) &&
      fs.existsSync(resolveLocalReceiptPdfPath(pdfUrl)!);
    return { ...receipt, pdfReady };
  },

  async ensureReceiptPdf(currentUser: AuthUser, id: string, force = false) {
    const receipt = await FeeRepository.findReceiptById(id, currentUser.instituteId);
    if (!receipt) throw new AppError("Receipt not found", 404);
    assertBranchRecordAccess(currentUser, (receipt as { branchId?: string | null }).branchId);
    if ((receipt as { status?: string }).status !== "SUCCESS") {
      throw new AppError("PDF is only available for successful payments", 400);
    }
    const generated = await generateAndStoreReceiptPdf(id, { force });
    if (!generated) throw new AppError("Failed to generate receipt PDF", 500);
    return {
      ...receipt,
      receiptPdfUrl: generated.receiptPdfUrl,
      receiptGeneratedAt: generated.receiptGeneratedAt,
      pdfReady: true,
    };
  },

  async getReceiptPdfPath(currentUser: AuthUser, id: string): Promise<{
    absolutePath: string;
    filename: string;
  }> {
    let receipt = (await FeeService.ensureReceiptPdf(currentUser, id, false)) as {
      receiptPdfUrl?: string;
      receiptNo?: string;
    };
    let url = receipt.receiptPdfUrl || "";
    let absolutePath = resolveLocalReceiptPdfPath(url);

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      receipt = (await FeeService.ensureReceiptPdf(currentUser, id, true)) as {
        receiptPdfUrl?: string;
        receiptNo?: string;
      };
      url = receipt.receiptPdfUrl || "";
      absolutePath = resolveLocalReceiptPdfPath(url);
    }

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      throw new AppError("Receipt PDF file missing on disk", 404);
    }
    return {
      absolutePath,
      filename: `${(receipt.receiptNo || id).replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`,
    };
  },

  async getReceipts(currentUser: AuthUser, query: QueryReceiptsDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    return FeeRepository.findReceipts(scope.instituteId, {
      search: query.search,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      feeHeadMasterId: query.feeHeadMasterId,
      page: query.page,
      limit: query.limit,
    });
  },
};
