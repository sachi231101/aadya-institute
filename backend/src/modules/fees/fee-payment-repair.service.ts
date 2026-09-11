import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { applyFifoSameHeadOnly, derivePendingStatus, startOfDay } from "./fee-balance.util";
import { roundMoney, toMoneyNumber } from "./fee-money.util";
import {
  linkAllocationToInvoice,
  syncInvoicesForPendingFeeIds,
} from "./fee-invoice.service";

const repairedInstitutes = new Set<string>();

/**
 * Legacy provision stored the full fee-head total on every installment row's
 * `totalFee`, while `dueAmount` held each installment. Some admissions also
 * created installment amounts that summed above that head total. Cap each
 * student+fee-head group so sum(paid + due) equals the shared head total.
 */
async function repairInflatedInstallmentGroups(instituteId: string): Promise<number> {
  const rows = await prisma.pendingFee.findMany({
    where: { instituteId },
    orderBy: [{ studentId: "asc" }, { feeHeadMasterId: "asc" }, { installmentNo: "asc" }],
  });

  type Group = {
    headTotal: number;
    rows: Array<{
      id: string;
      amountPaid: number;
      dueAmount: number;
      dueDate: Date;
      installmentNo: number;
    }>;
  };

  const groups = new Map<string, Group>();
  for (const row of rows) {
    if (!row.studentId) continue;
    const key = `${row.studentId}::${row.feeHeadMasterId || row.feeHead || "none"}`;
    const paid = toMoneyNumber(row.amountPaid);
    const due = toMoneyNumber(row.dueAmount);
    const headTotal = toMoneyNumber(row.totalFee);
    const existing = groups.get(key) || { headTotal: 0, rows: [] };
    // Shared duplicated totalFee across installments — take the max seen
    existing.headTotal = Math.max(existing.headTotal, headTotal);
    existing.rows.push({
      id: row.id,
      amountPaid: paid,
      dueAmount: due,
      dueDate: row.dueDate,
      installmentNo: row.installmentNo,
    });
    groups.set(key, existing);
  }

  let fixed = 0;
  const today = startOfDay();

  for (const [, group] of groups) {
    if (group.rows.length < 2 || group.headTotal <= 0) continue;
    const obligation = roundMoney(
      group.rows.reduce((s, r) => s + r.amountPaid + Math.max(0, r.dueAmount), 0)
    );
    let excess = roundMoney(obligation - group.headTotal);
    if (excess <= 0.009) continue;

    // Trim remaining due from the earliest installment first (where overstatement usually sits)
    const ordered = [...group.rows].sort((a, b) => a.installmentNo - b.installmentNo);
    for (const row of ordered) {
      if (excess <= 0.009) break;
      if (row.dueAmount <= 0) continue;
      const cut = roundMoney(Math.min(row.dueAmount, excess));
      if (cut <= 0) continue;
      const dueAmount = roundMoney(row.dueAmount - cut);
      const status = derivePendingStatus(dueAmount, row.dueDate, row.amountPaid, today);
      await prisma.pendingFee.update({
        where: { id: row.id },
        data: {
          dueAmount,
          status,
          overdueDays: 0,
          // Keep totalFee as this installment's true charge after trim
          totalFee: roundMoney(row.amountPaid + dueAmount),
        },
      });
      excess = roundMoney(excess - cut);
      fixed += 1;
    }
  }

  return fixed;
}

/**
 * Legacy admissions sometimes created SUCCESS receipts without PaymentAllocation
 * rows, so PendingFee dues never decreased. Allocate those receipts FIFO onto
 * the student's open charge lines (once per process per institute).
 */
export async function repairUnallocatedPayments(instituteId: string): Promise<number> {
  if (repairedInstitutes.has(instituteId)) return 0;

  const inflatedFixed = await repairInflatedInstallmentGroups(instituteId).catch((err) => {
    logger.warn("Failed inflated installment repair", {
      instituteId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  });

  const orphans = await prisma.payment.findMany({
    where: {
      instituteId,
      status: "SUCCESS",
      allocations: { none: {} },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 500,
  });

  if (orphans.length === 0 && inflatedFixed === 0) {
    repairedInstitutes.add(instituteId);
    return 0;
  }

  let repaired = inflatedFixed;

  for (const payment of orphans) {
    if (!payment.studentId) continue;
    const amount = toMoneyNumber(payment.amount);
    if (amount <= 0) continue;

    try {
      const applied = await prisma.$transaction(async (tx) => {
        // Re-check inside txn — may have been repaired concurrently
        const allocCount = await tx.paymentAllocation.count({
          where: { paymentId: payment.id },
        });
        if (allocCount > 0) return 0;

        const openPending = await tx.pendingFee.findMany({
          where: {
            instituteId,
            studentId: payment.studentId!,
            dueAmount: { gt: 0 },
          },
          orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }],
        });
        if (openPending.length === 0) return 0;

        const balanceRows = openPending.map((p) => ({
          id: p.id,
          dueAmount: toMoneyNumber(p.dueAmount),
          amountPaid: toMoneyNumber(p.amountPaid),
          dueDate: p.dueDate,
          installmentNo: p.installmentNo,
          feeHeadMasterId: p.feeHeadMasterId,
        }));

        const { allocations } = applyFifoSameHeadOnly(
          balanceRows,
          amount,
          payment.feeHeadMasterId
        );
        if (allocations.length === 0) return 0;

        let appliedTotal = 0;
        for (const alloc of allocations) {
          if (!alloc.row.id || alloc.applied <= 0) continue;
          appliedTotal = roundMoney(appliedTotal + alloc.applied);
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

        if (appliedTotal <= 0) return 0;

        await syncInvoicesForPendingFeeIds(
          tx,
          allocations.map((a) => a.row.id!).filter(Boolean)
        );

        if (allocations.length === 1 && allocations[0].row.id) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { pendingFeeId: allocations[0].row.id },
          });
        }

        return appliedTotal;
      });

      if (applied > 0) {
        repaired += 1;
        logger.info("Repaired unallocated payment", {
          instituteId,
          paymentId: payment.id,
          receiptNo: payment.receiptNo,
          applied,
        });
      }
    } catch (err) {
      logger.warn("Failed to repair unallocated payment", {
        instituteId,
        paymentId: payment.id,
        receiptNo: payment.receiptNo,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Re-run inflation trim after allocations may have changed balances
  repaired += await repairInflatedInstallmentGroups(instituteId).catch(() => 0);

  repairedInstitutes.add(instituteId);
  return repaired;
}

/** Test helper — allow re-running repair in the same process. */
export function resetUnallocatedPaymentRepairState(): void {
  repairedInstitutes.clear();
}
