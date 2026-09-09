import { FeeRepository } from "./fee.repository";
import type {
  QueryPaymentsDTO,
  CreatePaymentDTO,
  QueryPendingFeesDTO,
  CollectPendingFeeDTO,
  QueryFeePlansDTO,
  CreateFeePlanDTO,
  UpdateFeePlanDTO,
  QueryReceiptsDTO,
  StudentFeeStatementSummary,
} from "./fee.types";
import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";
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
  }>
): StudentFeeStatementSummary => {
  const amountPaid = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const dueAmount = pendingFees.reduce((sum, f) => sum + Math.max(0, f.dueAmount || 0), 0);
  const totalFee =
    pendingFees[0]?.totalFee ||
    (amountPaid + dueAmount > 0 ? amountPaid + dueAmount : 0);
  const today = startOfDay();
  const hasOverdue = pendingFees.some(
    (f) =>
      f.dueAmount > 0 &&
      derivePendingStatus(f.dueAmount, f.dueDate, f.amountPaid, today) === "OVERDUE"
  );
  const hasPartial = pendingFees.some((f) => f.dueAmount > 0 && f.amountPaid > 0);
  let status: StudentFeeStatementSummary["status"] = "Pending";
  if (dueAmount <= 0 && totalFee > 0) status = "Paid";
  else if (hasOverdue) status = "Overdue";
  else if (hasPartial || (amountPaid > 0 && dueAmount > 0)) status = "Partial";
  else if (dueAmount > 0) status = "Pending";

  const nextDue = pendingFees.find((f) => f.dueAmount > 0);
  return {
    totalFee,
    amountPaid,
    dueAmount,
    status,
    nextDueDate: nextDue?.dueDate ? new Date(nextDue.dueDate).toISOString() : undefined,
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
    const courseName =
      admission?.course?.name || dto.courseName || "Enrolled Course";
    const admissionId = dto.admissionId || admission?.id || null;
    const branchId = student.branchId;

    const totalAmount = dto.amount + (dto.lateFee || 0);
    const masters = await resolvePaymentMasters(currentUser.instituteId, dto, branchId);

    // Targeted installment collect
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
      if (totalAmount > pendingItem.dueAmount) {
        throw new AppError(
          `Amount paid (₹${totalAmount}) exceeds due amount (₹${pendingItem.dueAmount})`,
          400
        );
      }

      const receiptNo = await SequenceService.getNextNumber(
        currentUser.instituteId,
        "RECEIPT"
      );
      const result = await FeeRepository.recordPendingFeePayment(
        pendingItem,
        receiptNo,
        {
          amountPaidNow: totalAmount,
          method: masters.method,
          paymentModeMasterId: masters.paymentModeMasterId,
          feeHeadMasterId: masters.feeHeadMasterId ?? pendingItem.feeHeadMasterId ?? undefined,
          feeHead: masters.feeHead ?? pendingItem.feeHead ?? undefined,
          transactionRef: dto.transactionRef,
          notes: dto.notes,
        },
        recordedById
      );

      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: student.id,
        studentName,
        courseName: pendingItem.courseName,
        paymentId: result.payment.id,
        amount: result.payment.amount,
        receiptNo: result.payment.receiptNo,
        enabled: dto.sendWhatsAppReceipt,
      });

      return result.payment;
    }

    // FIFO across open installments — one Payment per installment touched
    const openPending = await FeeRepository.findOpenPendingFeesForStudent(
      currentUser.instituteId,
      student.id,
      { admissionId, courseName }
    );

    const allocationPreview = openPending.length
      ? openPending
      : [];
    // Estimate how many receipt numbers we need
    let neededReceipts = 1;
    if (allocationPreview.length > 0) {
      let rem = totalAmount;
      neededReceipts = 0;
      for (const row of allocationPreview) {
        if (rem <= 0) break;
        if (row.dueAmount <= 0) continue;
        const applied = Math.min(rem, row.dueAmount);
        if (applied > 0) {
          neededReceipts += 1;
          rem -= applied;
        }
      }
      if (neededReceipts === 0) neededReceipts = 1;
      if (rem > 0) {
        throw new AppError(
          `Payment amount exceeds open installment dues by ₹${rem.toFixed(2)}`,
          400
        );
      }
    }

    const receiptNumbers: string[] = [];
    for (let i = 0; i < neededReceipts; i++) {
      receiptNumbers.push(
        await SequenceService.getNextNumber(currentUser.instituteId, "RECEIPT")
      );
    }

    const payments = await FeeRepository.recordFifoPayments({
      instituteId: currentUser.instituteId,
      student: {
        id: student.id,
        name: studentName,
        admissionNo,
        courseName,
        branchId,
        admissionId,
      },
      openPending,
      amount: totalAmount,
      masters,
      dto: { ...dto, amount: totalAmount },
      receiptNumbers,
      recordedById,
    });

    const primary = payments[0];
    if (primary && dto.sendWhatsAppReceipt !== false) {
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: student.id,
        studentName,
        courseName,
        paymentId: primary.id,
        amount: totalPaid,
        receiptNo: primary.receiptNo,
        enabled: dto.sendWhatsAppReceipt,
      });
    }

    return payments.length === 1 ? payments[0] : payments;
  },

  async deletePayment(currentUser: AuthUser, id: string) {
    const existing = await FeeRepository.findPaymentById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Payment record not found", 404);
    assertBranchRecordAccess(currentUser, existing.branchId);
    await FeeRepository.deletePaymentWithReverse(id, currentUser.instituteId);
    return { id };
  },

  async getPendingFees(currentUser: AuthUser, query: QueryPendingFeesDTO) {
    const scope = scopeParams(currentUser, query.branchId);
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

    if (dto.amountPaidNow > pendingItem.dueAmount) {
      throw new AppError(
        `Amount paid (₹${dto.amountPaidNow}) exceeds due amount (₹${pendingItem.dueAmount})`,
        400
      );
    }

    const receiptNo = await SequenceService.getNextNumber(
      currentUser.instituteId,
      "RECEIPT"
    );
    const masters = await resolvePaymentMasters(
      currentUser.instituteId,
      dto,
      pendingItem.branchId
    );

    const result = await FeeRepository.recordPendingFeePayment(
      pendingItem,
      receiptNo,
      {
        ...dto,
        method: masters.method,
        paymentModeMasterId: masters.paymentModeMasterId,
        feeHeadMasterId: masters.feeHeadMasterId ?? pendingItem.feeHeadMasterId ?? undefined,
        feeHead: masters.feeHead ?? pendingItem.feeHead ?? undefined,
      },
      recordedById
    );

    if (pendingItem.studentId && result.payment) {
      await maybeSendPaymentConfirmation({
        instituteId: currentUser.instituteId,
        studentId: pendingItem.studentId,
        studentName: pendingItem.studentName,
        courseName: pendingItem.courseName,
        paymentId: result.payment.id,
        amount: result.payment.amount,
        receiptNo: result.payment.receiptNo,
      });
    }

    return result;
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

    const due = new Date(pendingItem.dueDate);
    const startOfToday = startOfDay();
    const isOverdue = due < startOfToday;
    const event = isOverdue
      ? NotificationEvent.FEE_OVERDUE_REMINDER
      : NotificationEvent.FEE_DUE_REMINDER;
    const dateKey = startOfToday.toISOString().slice(0, 10);

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
        amount: String(pendingItem.dueAmount),
        due_date: due.toLocaleDateString("en-IN"),
        course_name: pendingItem.courseName ?? "Course",
      },
      metadata: { pendingFeeId: pendingItem.id, manual: true },
    });

    return {
      message:
        notification?.status === "SKIPPED"
          ? `Reminder skipped (${notification.skipReason})`
          : `WhatsApp reminder queued for ${pendingItem.phone}`,
      notificationId: notification?.id ?? null,
      status: notification?.status ?? "SKIPPED",
      skipReason: notification?.skipReason ?? null,
      studentName: pendingItem.studentName,
      phone: pendingItem.phone,
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
    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: currentUser.instituteId },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!student) throw new AppError("Student not found", 404);
    assertBranchRecordAccess(currentUser, student.branchId);

    const scope = scopeParams(currentUser);
    const [payments, pendingFees] = await Promise.all([
      FeeRepository.findPaymentsByStudent(currentUser.instituteId, studentId, {
        branchId: scope.branchId,
        branchIds: scope.branchIds,
      }),
      FeeRepository.findPendingFeesByStudent(currentUser.instituteId, studentId, {
        branchId: scope.branchId,
        branchIds: scope.branchIds,
      }),
    ]);

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
      summary: summarizeStudentFees(payments, pendingFees),
    };
  },

  async getFeePlans(currentUser: AuthUser, query: QueryFeePlansDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    return FeeRepository.findFeePlans(scope.instituteId, {
      branchId: scope.branchId,
      branchIds: scope.branchIds,
      courseId: query.courseId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  },

  async createFeePlan(currentUser: AuthUser, dto: CreateFeePlanDTO) {
    const scope = getBranchScopeFilter(currentUser, dto.branchId);
    if (dto.branchId) assertBranchRecordAccess(currentUser, dto.branchId);
    return FeeRepository.createFeePlan(scope.instituteId, {
      ...dto,
      branchId: dto.branchId || scope.branchId,
    });
  },

  async updateFeePlan(currentUser: AuthUser, id: string, dto: UpdateFeePlanDTO) {
    const existing = await FeeRepository.findFeePlanById(id, currentUser.instituteId);
    if (!existing) throw new AppError("Fee plan template not found", 404);
    assertBranchRecordAccess(currentUser, existing.branchId);
    return FeeRepository.updateFeePlan(id, currentUser.instituteId, {
      ...dto,
      planType: dto.planType as never,
      status: dto.status as never,
    });
  },

  async getReceipts(currentUser: AuthUser, query: QueryReceiptsDTO) {
    const scope = getBranchScopeFilter(currentUser, query.branchId);
    return FeeRepository.findReceipts(scope.instituteId, {
      search: query.search,
      branchId: scope.branchId,
      branchIds: scope.branchIds,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      limit: query.limit,
    });
  },
};
