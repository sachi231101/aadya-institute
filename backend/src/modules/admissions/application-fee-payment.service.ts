import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { SequenceService } from "../masters/sequence.service";
import { FeeRepository } from "../fees/fee.repository";
import { roundMoney } from "../fees/fee-money.util";
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
 * (no student / pending-fee allocation required).
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

  await tx.payment.updateMany({
    where: {
      id: app.paymentId,
      instituteId: params.instituteId,
      status: "SUCCESS",
    },
    data: {
      studentId: params.studentId,
      admissionId: params.admissionId,
    },
  });
}
