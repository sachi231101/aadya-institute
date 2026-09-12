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

/**
 * Scale installment amounts so they sum exactly to `lineAmount`.
 * Used whenever custom installments are provided at admission/provision.
 */
export function normalizeInstallmentAmounts(
  lineAmount: number,
  installments: Array<{ installmentNo: number; amount: number; dueDate?: string; dueDays?: number }>
): Array<{ installmentNo: number; amount: number; dueDate?: string; dueDays?: number }> {
  const target = roundMoney(lineAmount);
  const positive = installments.filter((i) => Number(i.amount) > 0);
  if (positive.length === 0) return [];
  const partsSum = roundMoney(positive.reduce((s, i) => s + Number(i.amount), 0));
  if (partsSum <= 0) return [];
  if (Math.abs(partsSum - target) <= 0.009) {
    return positive.map((i) => ({
      ...i,
      installmentNo: i.installmentNo || 1,
      amount: roundMoney(Number(i.amount)),
    }));
  }
  const ratio = target / partsSum;
  let allocated = 0;
  return positive.map((inst, idx) => {
    if (idx === positive.length - 1) {
      return {
        ...inst,
        installmentNo: inst.installmentNo || 1,
        amount: roundMoney(target - allocated),
      };
    }
    const scaled = roundMoney(Number(inst.amount) * ratio);
    allocated = roundMoney(allocated + scaled);
    return { ...inst, installmentNo: inst.installmentNo || 1, amount: scaled };
  });
}

function expandLineInstallments(
  line: FeeProvisionLine,
  baseDate: Date
): Array<{ installmentNo: number; amount: number; dueDate: Date }> {
  const amount = roundMoney(line.amount);
  if (line.installments && line.installments.length > 0) {
    const normalized = normalizeInstallmentAmounts(amount, line.installments);
    return normalized.map((i) => {
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

  // Tuition-first for down payment; fall back to any open head so we never
  // record a SUCCESS receipt without reducing dues.
  let { allocations, remainingUnapplied } = applyFifoSameHeadOnly(
    balanceRows,
    downPay,
    tuition.id
  );
  if (allocations.length === 0) {
    ({ allocations, remainingUnapplied } = applyFifoSameHeadOnly(balanceRows, downPay, null));
  }

  if (allocations.length === 0) {
    throw new Error(
      `Cannot apply down payment of ₹${downPay}: no open fee dues to allocate`
    );
  }

  const appliedTotal = roundMoney(allocations.reduce((s, a) => s + a.applied, 0));
  if (appliedTotal <= 0) {
    throw new Error(
      `Cannot apply down payment of ₹${downPay}: allocation produced zero applied amount`
    );
  }

  const receiptNo = await SequenceService.getNextNumber(input.instituteId, "RECEIPT");
  const overpayNote =
    remainingUnapplied > 0.009
      ? ` | Applied ₹${appliedTotal} of ₹${downPay} (open dues capped)`
      : "";

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
      notes: `Initial / down payment${overpayNote}`,
      feeHeadMasterId: allocations[0]?.row.feeHeadMasterId || tuition.id,
      feeHead:
        pendingFees.find((p) => p.id === allocations[0]?.row.id)?.feeHead || tuition.name,
      pendingFeeId: allocations.length === 1 ? allocations[0].row.id || null : null,
      recordedById: input.recordedById || null,
    },
  });

  let allocationCount = 0;
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
    allocationCount += 1;
  }

  if (allocationCount === 0) {
    throw new Error(
      `Down payment receipt ${receiptNo} could not be linked to charge lines — aborting`
    );
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
    const normalized = normalizeInstallmentAmounts(total, params.installments);
    return [
      {
        feeHeadMasterId: params.tuitionHeadId,
        feeHead: params.tuitionHeadName,
        amount: total,
        installments: normalized.map((i) => ({
          installmentNo: i.installmentNo,
          amount: i.amount,
          dueDate: i.dueDate,
          dueDays: i.dueDays,
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
