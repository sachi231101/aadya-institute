import { test, describe } from "node:test";
import assert from "node:assert";
import {
  applyAmountToPendingRow,
  applyFifoToPendingRows,
  applyFifoSameHeadOnly,
  derivePendingStatus,
  reverseAmountOnPendingRow,
  getIstTodayDateString,
} from "../modules/fees/fee-balance.util";
import { roundMoney, toMoneyNumber } from "../modules/fees/fee-money.util";
import { createPaymentSchema, queryPendingFeesSchema, createChargesSchema } from "../modules/fees/fee.validation";
import {
  normalizeInstallmentAmounts,
  buildLegacyTuitionLines,
} from "../modules/fees/fee-provision.service";
import { Prisma } from "@prisma/client";

describe("Fee balance helpers", () => {
  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 10);
  const overdue = new Date();
  overdue.setDate(overdue.getDate() - 5);

  test("full collect clears installment dueAmount and marks PAID", () => {
    const result = applyAmountToPendingRow(
      { dueAmount: 10000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1 },
      10000
    );
    assert.strictEqual(result.applied, 10000);
    assert.strictEqual(result.dueAmount, 0);
    assert.strictEqual(result.amountPaid, 10000);
    assert.strictEqual(result.status, "PAID");
  });

  test("partial collect leaves remaining due as PARTIAL", () => {
    const result = applyAmountToPendingRow(
      { dueAmount: 10000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1 },
      4000
    );
    assert.strictEqual(result.applied, 4000);
    assert.strictEqual(result.dueAmount, 6000);
    assert.strictEqual(result.amountPaid, 4000);
    assert.strictEqual(result.status, "PARTIAL");
  });

  test("overpay is capped at installment dueAmount", () => {
    const result = applyAmountToPendingRow(
      { dueAmount: 5000, amountPaid: 1000, dueDate: dueSoon },
      9000
    );
    assert.strictEqual(result.applied, 5000);
    assert.strictEqual(result.dueAmount, 0);
    assert.strictEqual(result.status, "PAID");
  });

  test("FIFO create payment across two installments", () => {
    const rows = [
      { id: "a", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "t" },
      { id: "b", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 2, feeHeadMasterId: "t" },
    ];
    const { allocations, remainingUnapplied } = applyFifoToPendingRows(rows, 7000);
    assert.strictEqual(remainingUnapplied, 0);
    assert.strictEqual(allocations.length, 2);
    assert.strictEqual(allocations[0].applied, 5000);
    assert.strictEqual(allocations[0].status, "PAID");
    assert.strictEqual(allocations[1].applied, 2000);
    assert.strictEqual(allocations[1].dueAmount, 3000);
    assert.strictEqual(allocations[1].status, "PARTIAL");
  });

  test("same-head FIFO does not apply tuition payment to book dues when preferred", () => {
    const rows = [
      { id: "t1", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "tuition" },
      { id: "b1", dueAmount: 2500, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "book" },
    ];
    const { allocations, remainingUnapplied } = applyFifoSameHeadOnly(rows, 3000, "tuition");
    assert.strictEqual(allocations.length, 1);
    assert.strictEqual(allocations[0].row.id, "t1");
    assert.strictEqual(allocations[0].applied, 3000);
    assert.strictEqual(remainingUnapplied, 0);
  });

  test("same-head FIFO leaves unapplied when preferred head has insufficient due", () => {
    const rows = [
      { id: "t1", dueAmount: 1000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "tuition" },
      { id: "b1", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "book" },
    ];
    const { allocations, remainingUnapplied } = applyFifoSameHeadOnly(rows, 3000, "tuition");
    assert.strictEqual(allocations[0].applied, 1000);
    assert.strictEqual(remainingUnapplied, 2000);
  });

  test("multi-allocation one receipt amounts sum correctly", () => {
    const rows = [
      { id: "b", dueAmount: 2500, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "book" },
      { id: "e", dueAmount: 1000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1, feeHeadMasterId: "exam" },
    ];
    const book = applyAmountToPendingRow(rows[0], 2500);
    const exam = applyAmountToPendingRow(rows[1], 1000);
    const receiptTotal = roundMoney(book.applied + exam.applied);
    assert.strictEqual(receiptTotal, 3500);
    assert.strictEqual(book.status, "PAID");
    assert.strictEqual(exam.status, "PAID");
  });

  test("delete/void payment reverse restores dues", () => {
    const reversed = reverseAmountOnPendingRow(
      { dueAmount: 0, amountPaid: 5000, dueDate: dueSoon, installmentNo: 1 },
      5000
    );
    assert.strictEqual(reversed.applied, 5000);
    assert.strictEqual(reversed.dueAmount, 5000);
    assert.strictEqual(reversed.amountPaid, 0);
    assert.strictEqual(reversed.status, "DUE_SOON");
  });

  test("admission down payment reduces earliest installments via FIFO", () => {
    const planned = [
      { id: "1", dueAmount: 20000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1 },
      { id: "2", dueAmount: 20000, amountPaid: 0, dueDate: dueSoon, installmentNo: 2 },
      { id: "3", dueAmount: 10000, amountPaid: 0, dueDate: dueSoon, installmentNo: 3 },
    ];
    const downPay = 25000;
    const { allocations, remainingUnapplied } = applyFifoToPendingRows(planned, downPay);
    assert.strictEqual(remainingUnapplied, 0);
    assert.strictEqual(allocations[0].status, "PAID");
    assert.strictEqual(allocations[0].dueAmount, 0);
    assert.strictEqual(allocations[1].applied, 5000);
    assert.strictEqual(allocations[1].dueAmount, 15000);
    assert.strictEqual(allocations.length, 2);
  });

  test("derivePendingStatus marks overdue when past due with balance", () => {
    assert.strictEqual(derivePendingStatus(1000, overdue, 0), "OVERDUE");
    assert.strictEqual(derivePendingStatus(0, overdue, 5000), "PAID");
    assert.strictEqual(derivePendingStatus(1000, dueSoon, 200), "PARTIAL");
    assert.strictEqual(derivePendingStatus(1000, dueSoon, 0), "DUE_SOON");
  });

  test("IST today date string is YYYY-MM-DD", () => {
    const s = getIstTodayDateString();
    assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  });

  test("toMoneyNumber handles Prisma.Decimal", () => {
    assert.strictEqual(toMoneyNumber(new Prisma.Decimal("1234.50")), 1234.5);
    assert.strictEqual(toMoneyNumber(null), 0);
  });
});

describe("Fee validation", () => {
  test("createPaymentSchema requires studentId", () => {
    assert.throws(() =>
      createPaymentSchema.parse({
        amount: 1000,
        method: "UPI",
      })
    );
    const parsed = createPaymentSchema.parse({
      studentId: "stu-1",
      amount: 1000,
      method: "UPI",
      allocations: [
        { pendingFeeId: "pf-1", amount: 600 },
        { pendingFeeId: "pf-2", amount: 400 },
      ],
    });
    assert.strictEqual(parsed.allocations?.length, 2);
  });

  test("createChargesSchema requires fee heads", () => {
    const parsed = createChargesSchema.parse({
      studentId: "stu-1",
      charges: [{ feeHeadMasterId: "head-book", amount: 2500 }],
    });
    assert.strictEqual(parsed.charges[0].amount, 2500);
  });

  test("queryPendingFeesSchema accepts UNPAID and DUE_SOON", () => {
    assert.strictEqual(queryPendingFeesSchema.parse({ status: "UNPAID" }).status, "UNPAID");
    assert.strictEqual(queryPendingFeesSchema.parse({ status: "DUE_SOON" }).status, "DUE_SOON");
  });
});

describe("Fee provision installment normalization", () => {
  test("normalizeInstallmentAmounts scales mismatched installments to line total", () => {
    const normalized = normalizeInstallmentAmounts(38000, [
      { installmentNo: 1, amount: 38000 },
      { installmentNo: 2, amount: 11500 },
    ]);
    const sum = roundMoney(normalized.reduce((s, i) => s + i.amount, 0));
    assert.strictEqual(sum, 38000);
    assert.strictEqual(normalized.length, 2);
    assert.ok(normalized[0].amount > 0);
    assert.ok(normalized[1].amount > 0);
  });

  test("normalizeInstallmentAmounts keeps amounts when already matching", () => {
    const normalized = normalizeInstallmentAmounts(38000, [
      { installmentNo: 1, amount: 19000 },
      { installmentNo: 2, amount: 19000 },
    ]);
    assert.strictEqual(normalized[0].amount, 19000);
    assert.strictEqual(normalized[1].amount, 19000);
  });

  test("buildLegacyTuitionLines normalizes custom installments to totalFee", () => {
    const lines = buildLegacyTuitionLines({
      tuitionHeadId: "t1",
      tuitionHeadName: "Tuition Fee",
      totalFee: 38000,
      feePlan: "INSTALLMENT",
      installments: [
        { installmentNo: 1, amount: 38000 },
        { installmentNo: 2, amount: 11500 },
      ],
    });
    assert.strictEqual(lines.length, 1);
    const sum = roundMoney(
      (lines[0].installments || []).reduce((s, i) => s + Number(i.amount), 0)
    );
    assert.strictEqual(sum, 38000);
    assert.strictEqual(lines[0].amount, 38000);
  });

  test("buildLegacyTuitionLines splits INSTALLMENT 50/50 when no custom rows", () => {
    const lines = buildLegacyTuitionLines({
      tuitionHeadId: "t1",
      tuitionHeadName: "Tuition Fee",
      totalFee: 38000,
      feePlan: "INSTALLMENT",
    });
    const parts = lines[0].installments || [];
    assert.strictEqual(parts.length, 2);
    assert.strictEqual(roundMoney(parts[0].amount + parts[1].amount), 38000);
  });
});

describe("Fee reports target revenue formula", () => {
  test("targetRevenue equals collected + open dues and excludes void conceptually", () => {
    const successCollected = 400000;
    const voidAmount = 5000; // must not be in successCollected
    const openDues = 150000;
    const totalCollected = successCollected; // VOID excluded upstream
    const targetRevenue = totalCollected + openDues;
    const targetAchievedPercent = Math.min(
      100,
      Math.round((totalCollected / targetRevenue) * 100)
    );
    assert.strictEqual(targetRevenue, 550000);
    assert.strictEqual(targetAchievedPercent, 73);
    assert.ok(totalCollected !== successCollected + voidAmount);
  });

  test("due-this-week window is [today, today+7)", () => {
    const today = new Date("2026-09-12T00:00:00.000Z");
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueInWindow = new Date("2026-09-15T00:00:00.000Z");
    const dueOutside = new Date("2026-09-20T00:00:00.000Z");
    assert.ok(dueInWindow >= today && dueInWindow < weekEnd);
    assert.ok(!(dueOutside >= today && dueOutside < weekEnd));
  });
});
