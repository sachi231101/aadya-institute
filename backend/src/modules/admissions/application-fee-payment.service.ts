import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";
import { FeeRepository } from "../fees/fee.repository";
import { roundMoney, toMoneyNumber } from "../fees/fee-money.util";
import { startOfDay } from "../fees/fee-balance.util";
import {
  issueStudentInvoiceForPendingFee,
  linkAllocationToInvoice,
  syncInvoicesForPendingFeeIds,
} from "../fees/fee-invoice.service";
import { AppError } from "../../middlewares/error.middleware";

export async function resolveApplicationFeeHead(
  tx: Prisma.TransactionClient,
  instituteId: string
): Promise<{ id: string; name: string; code: string | null }> {
  const byCode = await tx.masterRecord.findFirst({
    where: {
      instituteId,
      entityType: "feeheads",
      code: "APPLICATION_FEE",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
  if (byCode) return { id: byCode.id, name: byCode.name, code: byCode.code };

  const byName = await tx.masterRecord.findFirst({
    where: {
      instituteId,
      entityType: "feeheads",
      name: { equals: "Application Fee", mode: "insensitive" },
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
  if (byName) return { id: byName.id, name: byName.name, code: byName.code };

  const created = await tx.masterRecord.create({
    data: {
      instituteId,
      entityType: "feeheads",
      code: "APPLICATION_FEE",
      name: "Application Fee",
      status: "ACTIVE",
      sortOrder: 6,
    },
  });
  return { id: created.id, name: created.name, code: created.code };
}

export function isApplicationFeePayment(payment: {
  feeHeadMasterId?: string | null;
  feeHead?: string | null;
  notes?: string | null;
  feeHeadCode?: string | null;
}): boolean {
  if (payment.feeHeadCode === "APPLICATION_FEE") return true;
  if (payment.feeHead && /application\s*fee/i.test(payment.feeHead)) return true;
  if (payment.notes && /^Application fee\s*·/i.test(payment.notes.trim())) return true;
  return false;
}

export type ApplicationFeePaymentInput = {
  instituteId: string;
  branchId: string | null;
  applicationId: string;
  applicationNo: string;
  applicantName: string;
  courseName: string;
  amount: number;
  paymentModeMasterId: string;
  paymentRef?: string | null;
  existingPaymentId?: string | null;
  recordedById?: string | null;
};

/**
 * Creates or updates a standalone SUCCESS Payment for an application fee
 * (no student / pending-fee allocation required until admission).
 */
export async function recordApplicationFeePayment(
  input: ApplicationFeePaymentInput
): Promise<{ paymentId: string; receiptNo: string }> {
  const amount = roundMoney(input.amount);
  if (amount <= 0) {
    throw new AppError("Application fee amount must be greater than 0", 400);
  }

  let existingPaymentId = input.existingPaymentId || null;

  if (existingPaymentId) {
    const existing = await prisma.payment.findFirst({
      where: { id: existingPaymentId, instituteId: input.instituteId },
      include: { allocations: { take: 1 } },
    });

    if (
      existing &&
      existing.status === "SUCCESS" &&
      existing.allocations.length === 0 &&
      !existing.pendingFeeId
    ) {
      const mode = await prisma.masterRecord.findFirst({
        where: {
          id: input.paymentModeMasterId,
          instituteId: input.instituteId,
          entityType: "paymentmodes",
          status: "ACTIVE",
        },
      });
      if (!mode) {
        throw new AppError("Payment mode not found or inactive", 400);
      }
      const feeHead = await resolveApplicationFeeHead(prisma, input.instituteId);
      const method = mode.code || mode.name || "UPI";
      const notes = `Application fee · ${input.applicationNo}`;

      const updated = await prisma.payment.update({
        where: { id: existing.id },
        data: {
          branchId: input.branchId,
          studentName: input.applicantName,
          admissionNo: input.applicationNo,
          courseName: input.courseName,
          amount,
          method,
          paymentModeMasterId: mode.id,
          feeHeadMasterId: feeHead.id,
          feeHead: feeHead.name,
          transactionRef: input.paymentRef || null,
          notes,
          recordedById: input.recordedById || existing.recordedById,
          date: new Date(),
        },
      });
      await prisma.application.update({
        where: { id: input.applicationId },
        data: { paymentId: updated.id },
      });
      return { paymentId: updated.id, receiptNo: updated.receiptNo };
    }

    if (existing && existing.status === "SUCCESS") {
      await FeeRepository.voidPayment(existing.id, input.instituteId);
      existingPaymentId = null;
      await prisma.application.update({
        where: { id: input.applicationId },
        data: { paymentId: null },
      });
    }
  }

  return prisma.$transaction(async (tx) => {
    const mode = await tx.masterRecord.findFirst({
      where: {
        id: input.paymentModeMasterId,
        instituteId: input.instituteId,
        entityType: "paymentmodes",
        status: "ACTIVE",
      },
    });
    if (!mode) {
      throw new AppError("Payment mode not found or inactive", 400);
    }

    const feeHead = await resolveApplicationFeeHead(tx, input.instituteId);
    const method = mode.code || mode.name || "UPI";
    const notes = `Application fee · ${input.applicationNo}`;
    const receiptNo = await SequenceService.getNextNumber(input.instituteId, "RECEIPT");

    const payment = await tx.payment.create({
      data: {
        receiptNo,
        instituteId: input.instituteId,
        branchId: input.branchId,
        studentId: null,
        admissionId: null,
        studentName: input.applicantName,
        admissionNo: input.applicationNo,
        courseName: input.courseName,
        amount,
        method,
        paymentModeMasterId: mode.id,
        feeHeadMasterId: feeHead.id,
        feeHead: feeHead.name,
        transactionRef: input.paymentRef || null,
        status: "SUCCESS",
        notes,
        recordedById: input.recordedById || null,
      },
    });

    await tx.application.update({
      where: { id: input.applicationId },
      data: { paymentId: payment.id },
    });

    return { paymentId: payment.id, receiptNo: payment.receiptNo };
  });
}

export async function voidApplicationFeePayment(
  instituteId: string,
  paymentId: string | null | undefined
): Promise<void> {
  if (!paymentId) return;
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, instituteId },
    select: { id: true, status: true },
  });
  if (!payment) return;
  if (payment.status === "VOID") return;
  await FeeRepository.voidPayment(payment.id, instituteId);
}

/**
 * Creates a PAID Application Fee PendingFee + allocation + invoice for a
 * SUCCESS payment that has no allocations yet. Idempotent when allocations exist.
 */
export async function materializeApplicationFeeCharge(
  tx: Prisma.TransactionClient,
  params: {
    paymentId: string;
    instituteId: string;
    studentId: string;
    admissionId: string;
  }
): Promise<{ pendingFeeId: string } | null> {
  const payment = await tx.payment.findFirst({
    where: {
      id: params.paymentId,
      instituteId: params.instituteId,
      status: "SUCCESS",
    },
    include: {
      allocations: { take: 1 },
    },
  });
  if (!payment) return null;

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      studentId: params.studentId,
      admissionId: params.admissionId,
    },
  });

  if (payment.allocations.length > 0) {
    return payment.pendingFeeId ? { pendingFeeId: payment.pendingFeeId } : null;
  }

  const amount = toMoneyNumber(payment.amount);
  if (amount <= 0) return null;

  const feeHead = await resolveApplicationFeeHead(tx, params.instituteId);
  const admission = await tx.admission.findFirst({
    where: { id: params.admissionId, instituteId: params.instituteId },
    include: {
      course: { select: { name: true } },
      student: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
  });
  if (!admission) return null;

  const studentName =
    admission.student?.user?.name || payment.studentName || "Student";
  const phone = admission.student?.user?.phone || "";
  const admissionNo = admission.admissionNo || payment.admissionNo;
  const courseName =
    admission.course?.name || payment.courseName || "Course";
  const branchId = admission.branchId || payment.branchId;
  const dueDate = startOfDay(payment.date || new Date());

  const pending = await tx.pendingFee.create({
    data: {
      instituteId: params.instituteId,
      branchId,
      studentId: params.studentId,
      admissionId: params.admissionId,
      studentName,
      admissionNo,
      phone,
      courseName,
      totalFee: amount,
      amountPaid: amount,
      dueAmount: 0,
      dueDate,
      installmentNo: 1,
      status: "PAID",
      overdueDays: 0,
      feeHeadMasterId: feeHead.id,
      feeHead: feeHead.name,
    },
  });

  await tx.paymentAllocation.create({
    data: {
      paymentId: payment.id,
      pendingFeeId: pending.id,
      amount,
    },
  });

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      pendingFeeId: pending.id,
      feeHeadMasterId: feeHead.id,
      feeHead: feeHead.name,
      studentName,
      admissionNo,
      courseName,
      branchId,
    },
  });

  await issueStudentInvoiceForPendingFee(tx, pending);
  await linkAllocationToInvoice(tx, payment.id, pending.id);
  await syncInvoicesForPendingFeeIds(tx, [pending.id]);

  return { pendingFeeId: pending.id };
}

export async function attachApplicationFeePaymentToAdmission(
  tx: Prisma.TransactionClient,
  params: {
    applicationId: string;
    instituteId: string;
    studentId: string;
    admissionId: string;
  }
): Promise<void> {
  const app = await tx.application.findFirst({
    where: { id: params.applicationId, instituteId: params.instituteId },
    select: { paymentId: true },
  });
  if (!app?.paymentId) return;

  await materializeApplicationFeeCharge(tx, {
    paymentId: app.paymentId,
    instituteId: params.instituteId,
    studentId: params.studentId,
    admissionId: params.admissionId,
  });
}
