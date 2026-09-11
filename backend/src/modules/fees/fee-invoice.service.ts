import type { Prisma, StudentInvoiceStatus } from "@prisma/client";
import { SequenceService } from "../masters/sequence.service";
import { derivePendingStatus, startOfDay } from "./fee-balance.util";
import { roundMoney, toMoneyNumber } from "./fee-money.util";

type Tx = Prisma.TransactionClient;

export function deriveInvoiceStatus(params: {
  totalAmount: number;
  amountPaid: number;
  balance: number;
  dueDate: Date;
  cancelled?: boolean;
  today?: Date;
}): StudentInvoiceStatus {
  if (params.cancelled) return "CANCELLED";
  const balance = roundMoney(params.balance);
  const paid = roundMoney(params.amountPaid);
  if (balance <= 0) return "PAID";
  const today = params.today || startOfDay();
  const overdueLike = derivePendingStatus(balance, params.dueDate, paid, today);
  if (overdueLike === "OVERDUE") return "OVERDUE";
  if (paid > 0) return "PARTIALLY_PAID";
  return "ISSUED";
}

export async function issueStudentInvoiceForPendingFee(
  tx: Tx,
  pendingFee: {
    id: string;
    instituteId: string;
    branchId: string | null;
    studentId: string | null;
    admissionId: string | null;
    studentName: string;
    admissionNo: string;
    courseName: string;
    feeHead: string | null;
    dueAmount: unknown;
    amountPaid: unknown;
    dueDate: Date;
    installmentNo: number;
    otherInvoiceId?: string | null;
  },
  opts?: {
    otherInvoiceId?: string | null;
    lineItems?: unknown;
    notes?: string | null;
    skipIfExists?: boolean;
  }
) {
  if (opts?.skipIfExists !== false) {
    const existing = await tx.studentInvoice.findUnique({
      where: { pendingFeeId: pendingFee.id },
    });
    if (existing) return existing;
  }

  const amountPaid = toMoneyNumber(pendingFee.amountPaid);
  const dueAmount = toMoneyNumber(pendingFee.dueAmount);
  const totalAmount = roundMoney(amountPaid + dueAmount);
  const balance = roundMoney(dueAmount);
  const invoiceNo = await SequenceService.getNextNumber(pendingFee.instituteId, "INVOICE");

  return tx.studentInvoice.create({
    data: {
      invoiceNo,
      instituteId: pendingFee.instituteId,
      branchId: pendingFee.branchId,
      studentId: pendingFee.studentId,
      admissionId: pendingFee.admissionId,
      pendingFeeId: pendingFee.id,
      otherInvoiceId: opts?.otherInvoiceId ?? pendingFee.otherInvoiceId ?? null,
      studentName: pendingFee.studentName,
      admissionNo: pendingFee.admissionNo,
      courseName: pendingFee.courseName,
      feeHead: pendingFee.feeHead,
      totalAmount,
      amountPaid,
      balance,
      status: deriveInvoiceStatus({
        totalAmount,
        amountPaid,
        balance,
        dueDate: pendingFee.dueDate,
      }),
      dueDate: pendingFee.dueDate,
      lineItems:
        (opts?.lineItems as Prisma.InputJsonValue) ??
        ([
          {
            name: pendingFee.feeHead || "Fee",
            amount: totalAmount,
            installmentNo: pendingFee.installmentNo,
          },
        ] as Prisma.InputJsonValue),
      notes: opts?.notes ?? null,
    },
  });
}

/** One StudentInvoice for an Other Invoice document (bundled lines). */
export async function issueBundledStudentInvoice(
  tx: Tx,
  params: {
    instituteId: string;
    branchId: string | null;
    studentId: string | null;
    admissionId: string | null;
    otherInvoiceId: string;
    studentName: string;
    admissionNo: string;
    courseName: string;
    totalAmount: number;
    amountPaid?: number;
    dueDate: Date;
    lineItems: unknown;
    notes?: string | null;
  }
) {
  const amountPaid = roundMoney(params.amountPaid || 0);
  const totalAmount = roundMoney(params.totalAmount);
  const balance = roundMoney(totalAmount - amountPaid);
  const invoiceNo = await SequenceService.getNextNumber(params.instituteId, "INVOICE");

  return tx.studentInvoice.create({
    data: {
      invoiceNo,
      instituteId: params.instituteId,
      branchId: params.branchId,
      studentId: params.studentId,
      admissionId: params.admissionId,
      otherInvoiceId: params.otherInvoiceId,
      studentName: params.studentName,
      admissionNo: params.admissionNo,
      courseName: params.courseName,
      feeHead: "Other charges",
      totalAmount,
      amountPaid,
      balance,
      status: deriveInvoiceStatus({
        totalAmount,
        amountPaid,
        balance,
        dueDate: params.dueDate,
      }),
      dueDate: params.dueDate,
      lineItems: params.lineItems as Prisma.InputJsonValue,
      notes: params.notes ?? null,
    },
  });
}

export async function syncStudentInvoiceFromPendingFee(
  tx: Tx,
  pendingFeeId: string
) {
  const pending = await tx.pendingFee.findUnique({ where: { id: pendingFeeId } });
  if (!pending) return null;

  let invoice = await tx.studentInvoice.findUnique({
    where: { pendingFeeId },
  });
  if (!invoice) {
    invoice = await issueStudentInvoiceForPendingFee(tx, pending);
  }

  const amountPaid = toMoneyNumber(pending.amountPaid);
  const balance = toMoneyNumber(pending.dueAmount);
  const totalAmount = roundMoney(amountPaid + balance);
  const status =
    invoice.status === "CANCELLED"
      ? ("CANCELLED" as StudentInvoiceStatus)
      : deriveInvoiceStatus({
          totalAmount,
          amountPaid,
          balance,
          dueDate: pending.dueDate,
        });

  return tx.studentInvoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid,
      balance,
      totalAmount,
      status,
      dueDate: pending.dueDate,
      feeHead: pending.feeHead,
    },
  });
}

export async function syncInvoicesForPendingFeeIds(tx: Tx, pendingFeeIds: string[]) {
  const unique = [...new Set(pendingFeeIds.filter(Boolean))];
  const results = [];
  for (const id of unique) {
    results.push(await syncStudentInvoiceFromPendingFee(tx, id));
  }
  return results;
}

export async function syncBundledInvoiceFromOtherInvoice(tx: Tx, otherInvoiceId: string) {
  const other = await tx.otherInvoice.findUnique({
    where: { id: otherInvoiceId },
    include: { pendingFees: true, studentInvoices: true },
  });
  if (!other) return null;

  const amountPaid = roundMoney(
    other.pendingFees.reduce((s, p) => s + toMoneyNumber(p.amountPaid), 0)
  );
  const balance = roundMoney(
    other.pendingFees.reduce((s, p) => s + toMoneyNumber(p.dueAmount), 0)
  );
  const totalAmount = roundMoney(toMoneyNumber(other.grandTotal));
  const dueDate = other.dueDate || other.invoiceDate;

  const status =
    other.status === "CANCELLED"
      ? "CANCELLED"
      : balance <= 0
        ? "PAID"
        : amountPaid > 0
          ? "PARTIALLY_PAID"
          : "ISSUED";

  await tx.otherInvoice.update({
    where: { id: other.id },
    data: {
      amountPaid,
      balance,
      status: status as never,
    },
  });

  const bundled = other.studentInvoices.find((i) => !i.pendingFeeId) || other.studentInvoices[0];
  if (!bundled) return other;

  const invStatus =
    bundled.status === "CANCELLED"
      ? ("CANCELLED" as StudentInvoiceStatus)
      : deriveInvoiceStatus({
          totalAmount,
          amountPaid,
          balance,
          dueDate,
        });

  await tx.studentInvoice.update({
    where: { id: bundled.id },
    data: { amountPaid, balance, totalAmount, status: invStatus },
  });

  return other;
}

export async function linkAllocationToInvoice(
  tx: Tx,
  paymentId: string,
  pendingFeeId: string
) {
  const invoice = await tx.studentInvoice.findUnique({
    where: { pendingFeeId },
  });
  if (!invoice) return;
  await tx.paymentAllocation.updateMany({
    where: { paymentId, pendingFeeId },
    data: { studentInvoiceId: invoice.id },
  });
}
