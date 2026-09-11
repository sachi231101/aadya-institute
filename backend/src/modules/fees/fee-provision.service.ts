import type { Prisma } from "@prisma/client";
import { SequenceService } from "../masters/sequence.service";
import {
  applyFifoSameHeadOnly,
  applyAmountToPendingRow,
  startOfDay,
} from "./fee-balance.util";
import { roundMoney, toMoneyNumber } from "./fee-money.util";
import type { FeeProvisionInput, FeeProvisionLine } from "./fee.types";
import {
  issueStudentInvoiceForPendingFee,
  linkAllocationToInvoice,
  syncInvoicesForPendingFeeIds,
} from "./fee-invoice.service";
import { enqueueReceiptPdfGeneration } from "./fee-receipt-pdf.service";

const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

export async function resolveTuitionFeeHead(
  tx: Prisma.TransactionClient,
  instituteId: string
): Promise<{ id: string; name: string; code: string | null }> {
  const byCode = await tx.masterRecord.findFirst({
    where: { instituteId, entityType: "feeheads", code: "TUITION", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (byCode) return { id: byCode.id, name: byCode.name, code: byCode.code };

  const byName = await tx.masterRecord.findFirst({
    where: {
      instituteId,
      entityType: "feeheads",
      name: { contains: "tuition", mode: "insensitive" },
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
  if (byName) return { id: byName.id, name: byName.name, code: byName.code };

  const any = await tx.masterRecord.findFirst({
    where: { instituteId, entityType: "feeheads", status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (any) return { id: any.id, name: any.name, code: any.code };

  const created = await tx.masterRecord.create({
    data: {
      instituteId,
      entityType: "feeheads",
      code: "TUITION",
      name: "Tuition Fee",
      status: "ACTIVE",
      sortOrder: 1,
    },
  });
  return { id: created.id, name: created.name, code: created.code };
}

async function resolveFeeHeadLabel(
  tx: Prisma.TransactionClient,
  instituteId: string,
  feeHeadMasterId: string,
  fallback?: string
): Promise<{ id: string; name: string; code: string | null }> {
  const row = await tx.masterRecord.findFirst({
    where: { id: feeHeadMasterId, instituteId, entityType: "feeheads" },
  });
  if (!row) {
    throw new Error(`Fee head not found: ${feeHeadMasterId}`);
  }
  return { id: row.id, name: fallback || row.name, code: row.code };
}

function expandLineInstallments(
  line: FeeProvisionLine,
  baseDate: Date
): Array<{ installmentNo: number; amount: number; dueDate: Date }> {
  const amount = roundMoney(line.amount);
  if (line.installments && line.installments.length > 0) {
    let parts = line.installments
      .filter((i) => Number(i.amount) > 0)
      .map((i) => {
        let dueDate: Date;
        if (i.dueDate) {
          dueDate = new Date(i.dueDate);
          if (Number.isNaN(dueDate.getTime())) dueDate = addDays(baseDate, i.dueDays ?? 0);
        } else {
          dueDate = addDays(baseDate, i.dueDays ?? 0);
        }
        return {
          installmentNo: i.installmentNo || 1,
          amount: roundMoney(Number(i.amount)),
          dueDate,
        };
      });

    // Keep installment dues aligned to the fee-head line total
    const partsSum = roundMoney(parts.reduce((s, p) => s + p.amount, 0));
    if (parts.length > 0 && partsSum > 0 && Math.abs(partsSum - amount) > 0.009) {
      const ratio = amount / partsSum;
      let allocated = 0;
      parts = parts.map((p, idx) => {
        if (idx === parts.length - 1) {
          return { ...p, amount: roundMoney(amount - allocated) };
        }
        const scaled = roundMoney(p.amount * ratio);
        allocated = roundMoney(allocated + scaled);
        return { ...p, amount: scaled };
      });
    }

    return parts;
  }
  return [{ installmentNo: 1, amount, dueDate: addDays(baseDate, 30) }];
}

/**
 * Create PendingFee charge rows (per fee head / installment) and optionally
 * record a down-payment receipt with PaymentAllocation rows.
 * Tuition-first same-head FIFO for down payment.
 */
export async function provisionStudentFeesInTransaction(
  tx: Prisma.TransactionClient,
  input: FeeProvisionInput
) {
  const baseDate = startOfDay();
  const tuition = await resolveTuitionFeeHead(tx, input.instituteId);
  const concession = roundMoney(input.concessionAmount || 0);
  const lines = input.lines.filter((l) => roundMoney(l.amount) > 0);

  if (lines.length === 0) {
    return { pendingFees: [], payment: null as null, concessionAmount: concession };
  }

  // Apply concession to tuition line(s) only (reduce net before creating installments)
  const adjusted: FeeProvisionLine[] = [];
  let remainingConcession = concession;
  for (const line of lines) {
    const head = await resolveFeeHeadLabel(
      tx,
      input.instituteId,
      line.feeHeadMasterId,
      line.feeHead
    );
    let amount = roundMoney(line.amount);
    const isTuition =
      head.id === tuition.id ||
      head.code === "TUITION" ||
      /tuition/i.test(head.name);

    if (isTuition && remainingConcession > 0) {
      const cut = Math.min(amount, remainingConcession);
      amount = roundMoney(amount - cut);
      remainingConcession = roundMoney(remainingConcession - cut);
    }

    if (amount <= 0) continue;

    // Scale installments if present
    let installments = line.installments;
    if (isTuition && concession > 0 && installments && installments.length > 0) {
      const originalSum = installments.reduce((s, i) => s + Number(i.amount), 0);
      if (originalSum > 0 && amount !== roundMoney(line.amount)) {
        const ratio = amount / originalSum;
        let allocated = 0;
        installments = installments.map((inst, idx) => {
          if (idx === installments!.length - 1) {
            return { ...inst, amount: roundMoney(amount - allocated) };
          }
          const part = roundMoney(Number(inst.amount) * ratio);
          allocated = roundMoney(allocated + part);
          return { ...inst, amount: part };
        });
      }
    }

    adjusted.push({
      ...line,
      feeHeadMasterId: head.id,
      feeHead: head.name,
      amount,
      installments,
    });
  }

  const createdIds: string[] = [];
  for (const line of adjusted) {
    const parts = expandLineInstallments(line, baseDate);
    for (const part of parts) {
      const row = await tx.pendingFee.create({
        data: {
          instituteId: input.instituteId,
          branchId: input.branchId,
          studentId: input.studentId,
          admissionId: input.admissionId,
          studentName: input.studentName,
          admissionNo: input.admissionNo,
          phone: input.phone || "",
          courseName: input.courseName,
          // Store this installment's charge (not duplicated course total)
          totalFee: part.amount,
          amountPaid: 0,
          dueAmount: part.amount,
          dueDate: part.dueDate,
          installmentNo: part.installmentNo,
          status: "DUE_SOON",
          feeHeadMasterId: line.feeHeadMasterId,
          feeHead: line.feeHead || null,
        },
      });
      createdIds.push(row.id);
    }
  }

  const pendingFees = await tx.pendingFee.findMany({
    where: { id: { in: createdIds } },
    orderBy: [{ feeHeadMasterId: "asc" }, { installmentNo: "asc" }, { dueDate: "asc" }],
  });

  for (const pf of pendingFees) {
    await issueStudentInvoiceForPendingFee(tx, pf);
  }

  const downPay = roundMoney(input.downPayment || 0);
  if (downPay <= 0 || pendingFees.length === 0) {
    return { pendingFees, payment: null, concessionAmount: concession };
  }

  const balanceRows = pendingFees.map((p) => ({
    id: p.id,
    dueAmount: toMoneyNumber(p.dueAmount),
    amountPaid: toMoneyNumber(p.amountPaid),
    dueDate: p.dueDate,
    installmentNo: p.installmentNo,
    feeHeadMasterId: p.feeHeadMasterId,
  }));

  // Tuition-first for down payment
  const { allocations, remainingUnapplied } = applyFifoSameHeadOnly(
    balanceRows,
    downPay,
    tuition.id
  );

  if (allocations.length === 0) {
    return { pendingFees, payment: null, concessionAmount: concession };
  }

  const appliedTotal = roundMoney(allocations.reduce((s, a) => s + a.applied, 0));
  if (remainingUnapplied > 0.009) {
    // Overpay beyond open dues — still record only applied portion
  }

  const receiptNo = await SequenceService.getNextNumber(input.instituteId, "RECEIPT");

  const payment = await tx.payment.create({
    data: {
      receiptNo,
      instituteId: input.instituteId,
      branchId: input.branchId,
      studentId: input.studentId,
      admissionId: input.admissionId,
      studentName: input.studentName,
      admissionNo: input.admissionNo,
      courseName: input.courseName,
      amount: appliedTotal,
      method: input.paymentMethod || "UPI",
      paymentModeMasterId: input.paymentModeMasterId || null,
      transactionRef: input.transactionRef || null,
      status: "SUCCESS",
      notes: "Initial / down payment",
      feeHeadMasterId: allocations[0]?.row.feeHeadMasterId || tuition.id,
      feeHead:
        pendingFees.find((p) => p.id === allocations[0]?.row.id)?.feeHead || tuition.name,
      pendingFeeId: allocations.length === 1 ? allocations[0].row.id || null : null,
      recordedById: input.recordedById || null,
    },
  });

  for (const alloc of allocations) {
    if (!alloc.row.id || alloc.applied <= 0) continue;
    await tx.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        pendingFeeId: alloc.row.id,
        amount: alloc.applied,
      },
    });
    await tx.pendingFee.update({
      where: { id: alloc.row.id },
      data: {
        amountPaid: alloc.amountPaid,
        dueAmount: alloc.dueAmount,
        status: alloc.status,
        overdueDays: alloc.overdueDays,
      },
    });
    await linkAllocationToInvoice(tx, payment.id, alloc.row.id);
  }

  await syncInvoicesForPendingFeeIds(
    tx,
    allocations.map((a) => a.row.id!).filter(Boolean)
  );

  const refreshed = await tx.pendingFee.findMany({
    where: { id: { in: createdIds } },
    orderBy: [{ feeHeadMasterId: "asc" }, { installmentNo: "asc" }, { dueDate: "asc" }],
  });

  enqueueReceiptPdfGeneration(payment.id);

  return { pendingFees: refreshed, payment, concessionAmount: concession };
}

/** Build a single tuition line from legacy totalFee + optional installment DTOs. */
export function buildLegacyTuitionLines(params: {
  tuitionHeadId: string;
  tuitionHeadName: string;
  totalFee: number;
  feePlan?: "FULL_PAYMENT" | "INSTALLMENT";
  installments?: Array<{ installmentNo: number; amount: number; dueDate?: string }>;
}): FeeProvisionLine[] {
  const total = roundMoney(params.totalFee);
  if (total <= 0) return [];

  if (params.installments && params.installments.length > 0) {
    return [
      {
        feeHeadMasterId: params.tuitionHeadId,
        feeHead: params.tuitionHeadName,
        amount: total,
        installments: params.installments.map((i) => ({
          installmentNo: i.installmentNo,
          amount: roundMoney(Number(i.amount)),
          dueDate: i.dueDate,
        })),
      },
    ];
  }

  if (params.feePlan === "FULL_PAYMENT") {
    return [
      {
        feeHeadMasterId: params.tuitionHeadId,
        feeHead: params.tuitionHeadName,
        amount: total,
        installments: [{ installmentNo: 1, amount: total, dueDays: 30 }],
      },
    ];
  }

  const part1 = Math.floor(total / 2);
  const part2 = roundMoney(total - part1);
  return [
    {
      feeHeadMasterId: params.tuitionHeadId,
      feeHead: params.tuitionHeadName,
      amount: total,
      installments: [
        { installmentNo: 1, amount: part1, dueDays: 30 },
        { installmentNo: 2, amount: part2, dueDays: 60 },
      ],
    },
  ];
}

export { applyAmountToPendingRow };
