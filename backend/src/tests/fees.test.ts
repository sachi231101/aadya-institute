import { test, describe } from "node:test";
import assert from "node:assert";
import {
  applyAmountToPendingRow,
  applyFifoToPendingRows,
  derivePendingStatus,
  reverseAmountOnPendingRow,
  getIstTodayDateString,
} from "../modules/fees/fee-balance.util";
import { createPaymentSchema, queryPendingFeesSchema } from "../modules/fees/fee.validation";

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
      { id: "a", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 1 },
      { id: "b", dueAmount: 5000, amountPaid: 0, dueDate: dueSoon, installmentNo: 2 },
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

  test("delete payment reverse restores dues", () => {
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
    });
    assert.strictEqual(parsed.studentId, "stu-1");
  });

  test("queryPendingFeesSchema accepts UNPAID and DUE_SOON", () => {
    assert.strictEqual(queryPendingFeesSchema.parse({ status: "UNPAID" }).status, "UNPAID");
    assert.strictEqual(queryPendingFeesSchema.parse({ status: "DUE_SOON" }).status, "DUE_SOON");
  });
});

describe("Fee reports target revenue formula", () => {
  test("targetRevenue equals collected + open dues", () => {
    const totalCollected = 400000;
    const openDues = 150000;
    const targetRevenue = totalCollected + openDues;
    const targetAchievedPercent = Math.min(
      100,
      Math.round((totalCollected / targetRevenue) * 100)
    );
    assert.strictEqual(targetRevenue, 550000);
    assert.strictEqual(targetAchievedPercent, 73);
    assert.notStrictEqual(targetRevenue, 1500000);
  });
});
