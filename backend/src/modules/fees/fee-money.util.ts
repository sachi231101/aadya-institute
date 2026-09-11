import { Prisma } from "@prisma/client";

/** Convert Prisma Decimal / number / string to a finite JS number for APIs. */
export const toMoneyNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return Number((value as { toNumber: () => number }).toNumber()) || 0;
    } catch {
      return Number(String(value)) || 0;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const toDecimal = (value: number | string | Prisma.Decimal): Prisma.Decimal => {
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
};

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const serializePayment = <T extends Record<string, unknown>>(row: T) => ({
  ...row,
  amount: toMoneyNumber(row.amount),
});

export const serializePendingFee = <T extends Record<string, unknown>>(row: T) => ({
  ...row,
  totalFee: toMoneyNumber(row.totalFee),
  amountPaid: toMoneyNumber(row.amountPaid),
  dueAmount: toMoneyNumber(row.dueAmount),
});
