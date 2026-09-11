import type { OverdueStatus } from "@prisma/client";
import { roundMoney } from "./fee-money.util";

export type PendingBalanceRow = {
  id?: string;
  dueAmount: number;
  amountPaid: number;
  dueDate: Date | string;
  installmentNo?: number;
  feeHeadMasterId?: string | null;
};

export type AppliedPendingBalance = {
  applied: number;
  dueAmount: number;
  amountPaid: number;
  status: OverdueStatus;
  overdueDays: number;
};

export type FifoAllocation<T extends PendingBalanceRow> = AppliedPendingBalance & {
  row: T;
};

export const startOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Calendar date in Asia/Kolkata as YYYY-MM-DD. */
export const getIstTodayDateString = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Inclusive UTC bounds for the current IST calendar day. */
export const getIstDayBounds = (now: Date = new Date()): { start: Date; end: Date } => {
  const dateStr = getIstTodayDateString(now);
  return {
    start: new Date(`${dateStr}T00:00:00+05:30`),
    end: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
};

export const overdueDaysFromDueDate = (
  dueDate: Date | string,
  today: Date = startOfDay()
): number => {
  const due = startOfDay(new Date(dueDate));
  if (Number.isNaN(due.getTime()) || due >= today) return 0;
  return Math.floor((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
};

/**
 * Derive installment status from remaining due, due date, and amount paid.
 * PAID when due is cleared; OVERDUE when past due with balance; PARTIAL when
 * partially paid and not overdue; otherwise DUE_SOON.
 */
export const derivePendingStatus = (
  dueAmount: number,
  dueDate: Date | string,
  amountPaid: number,
  today: Date = startOfDay()
): OverdueStatus => {
  if (roundMoney(dueAmount) <= 0) return "PAID";
  const due = startOfDay(new Date(dueDate));
  if (!Number.isNaN(due.getTime()) && due < today) return "OVERDUE";
  if (roundMoney(amountPaid) > 0) return "PARTIAL";
  return "DUE_SOON";
};

export const applyAmountToPendingRow = (
  row: PendingBalanceRow,
  amount: number,
  today: Date = startOfDay()
): AppliedPendingBalance => {
  const applied = roundMoney(Math.min(Math.max(0, amount), Math.max(0, row.dueAmount)));
  const dueAmount = roundMoney(Math.max(0, row.dueAmount - applied));
  const amountPaid = roundMoney(row.amountPaid + applied);
  const status = derivePendingStatus(dueAmount, row.dueDate, amountPaid, today);
  const overdueDays = status === "OVERDUE" ? overdueDaysFromDueDate(row.dueDate, today) : 0;
  return { applied, dueAmount, amountPaid, status, overdueDays };
};

/**
 * FIFO across pending rows. Callers should pre-filter to a single fee head
 * when cross-head allocation must be blocked.
 */
export const applyFifoToPendingRows = <T extends PendingBalanceRow>(
  rows: T[],
  amount: number,
  today: Date = startOfDay()
): { allocations: FifoAllocation<T>[]; remainingUnapplied: number } => {
  const sorted = [...rows].sort((a, b) => {
    const ai = a.installmentNo ?? 0;
    const bi = b.installmentNo ?? 0;
    if (ai !== bi) return ai - bi;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  let remaining = roundMoney(Math.max(0, amount));
  const allocations: FifoAllocation<T>[] = [];

  for (const row of sorted) {
    if (remaining <= 0) break;
    if (row.dueAmount <= 0) continue;
    const result = applyAmountToPendingRow(row, remaining, today);
    if (result.applied <= 0) continue;
    remaining = roundMoney(remaining - result.applied);
    allocations.push({ row, ...result });
  }

  return { allocations, remainingUnapplied: remaining };
};

/**
 * Same-head FIFO: applies amount within one preferred head, or head-by-head
 * without mixing heads in a single installment allocation chain.
 */
export const applyFifoSameHeadOnly = <T extends PendingBalanceRow>(
  rows: T[],
  amount: number,
  preferredHeadId?: string | null,
  today: Date = startOfDay()
): { allocations: FifoAllocation<T>[]; remainingUnapplied: number } => {
  if (preferredHeadId) {
    const scoped = rows.filter((r) => r.feeHeadMasterId === preferredHeadId);
    return applyFifoToPendingRows(scoped.length ? scoped : [], amount, today);
  }

  const headOrder: string[] = [];
  for (const row of rows) {
    const hid = row.feeHeadMasterId || "__none__";
    if (!headOrder.includes(hid)) headOrder.push(hid);
  }

  let remaining = roundMoney(Math.max(0, amount));
  const all: FifoAllocation<T>[] = [];
  for (const hid of headOrder) {
    if (remaining <= 0) break;
    const scoped = rows.filter((r) => (r.feeHeadMasterId || "__none__") === hid);
    const { allocations, remainingUnapplied } = applyFifoToPendingRows(scoped, remaining, today);
    all.push(...allocations);
    remaining = remainingUnapplied;
  }
  return { allocations: all, remainingUnapplied: remaining };
};

export const reverseAmountOnPendingRow = (
  row: PendingBalanceRow,
  amount: number,
  today: Date = startOfDay()
): AppliedPendingBalance => {
  const reversed = roundMoney(Math.min(Math.max(0, amount), Math.max(0, row.amountPaid)));
  const amountPaid = roundMoney(Math.max(0, row.amountPaid - reversed));
  const dueAmount = roundMoney(row.dueAmount + reversed);
  const status = derivePendingStatus(dueAmount, row.dueDate, amountPaid, today);
  const overdueDays = status === "OVERDUE" ? overdueDaysFromDueDate(row.dueDate, today) : 0;
  return { applied: reversed, dueAmount, amountPaid, status, overdueDays };
};

/** Enrich a pending-fee row with read-time status / overdueDays. */
export const withDerivedPendingStatus = <
  T extends {
    dueAmount: number;
    amountPaid: number;
    dueDate: Date | string;
    status: OverdueStatus;
    overdueDays: number;
  },
>(
  row: T,
  today: Date = startOfDay()
): T => {
  if (row.status === "PAID" || row.dueAmount <= 0) {
    return {
      ...row,
      status: "PAID" as OverdueStatus,
      overdueDays: 0,
      dueAmount: Math.max(0, row.dueAmount),
    };
  }
  const status = derivePendingStatus(row.dueAmount, row.dueDate, row.amountPaid, today);
  const overdueDays = status === "OVERDUE" ? overdueDaysFromDueDate(row.dueDate, today) : 0;
  return { ...row, status, overdueDays };
};
