/**
 * Display helpers so fee lists show Fee Head + Installment,
 * never course-wise splits of the same Tuition Fee.
 */

export function normalizeFeeHeadLabel(
  feeHead?: string | null,
  notes?: string | null
): string {
  const head = (feeHead || "").trim();
  if (/application\s*fee/i.test(head)) return "Application Fee";
  if (/tuition|course\s*fee/i.test(head)) return "Tuition Fee";
  if (/^Application fee\b/i.test(notes || "")) return "Application Fee";
  if (/down payment|initial/i.test(notes || "")) return "Tuition Fee";
  return head || "Fee";
}

export type MoneyLike = {
  id: string;
  studentId?: string | null;
  studentName: string;
  amount?: number;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
  dueAmount?: number;
  date?: string;
  dueDate?: string;
  feeHead?: string | null;
  notes?: string | null;
  courseName?: string;
  installmentNo?: number;
  status?: string;
  [key: string]: unknown;
};

/** Payments / receipts: one row per student + fee type (Tuition Fee, Application Fee, …). */
export function aggregateByStudentAndFeeType<T extends MoneyLike>(
  rows: T[]
): Array<
  T & {
    typeLabel: string;
    sourceIds: string[];
    amount: number;
  }
> {
  const map = new Map<
    string,
    T & { typeLabel: string; sourceIds: string[]; amount: number }
  >();

  for (const row of rows) {
    const typeLabel = normalizeFeeHeadLabel(row.feeHead, row.notes as string | null);
    const key = `${row.studentId || row.studentName}::${typeLabel}`;
    const amt = Number(row.amount ?? 0);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        typeLabel,
        sourceIds: [row.id],
        amount: amt,
      });
      continue;
    }
    existing.amount = Number(existing.amount) + amt;
    existing.sourceIds.push(row.id);
    const rowDate = row.date || row.dueDate;
    const existingDate = existing.date || existing.dueDate;
    if (rowDate && existingDate && new Date(rowDate) > new Date(existingDate)) {
      existing.id = row.id;
      existing.date = row.date;
      existing.status = row.status;
      Object.assign(existing, {
        receiptNo: (row as { receiptNo?: string }).receiptNo ?? (existing as { receiptNo?: string }).receiptNo,
        method: (row as { method?: string }).method ?? (existing as { method?: string }).method,
        receiptPdfUrl:
          (row as { receiptPdfUrl?: string | null }).receiptPdfUrl ??
          (existing as { receiptPdfUrl?: string | null }).receiptPdfUrl,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const da = a.date || a.dueDate || "";
    const db = b.date || b.dueDate || "";
    return new Date(db).getTime() - new Date(da).getTime();
  });
}

/** Invoices: one row per student + fee head (no course column). */
export function aggregateInvoicesByStudentAndFeeHead<
  T extends MoneyLike & {
    invoiceNo?: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
  },
>(rows: T[]): Array<T & { typeLabel: string; sourceIds: string[]; invoiceNos: string[] }> {
  const map = new Map<
    string,
    T & { typeLabel: string; sourceIds: string[]; invoiceNos: string[] }
  >();

  for (const row of rows) {
    const typeLabel = normalizeFeeHeadLabel(row.feeHead, null);
    const key = `${row.studentId || row.studentName}::${typeLabel}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        typeLabel,
        sourceIds: [row.id],
        invoiceNos: row.invoiceNo ? [row.invoiceNo] : [],
        totalAmount: Number(row.totalAmount),
        amountPaid: Number(row.amountPaid),
        balance: Number(row.balance),
      });
      continue;
    }
    existing.totalAmount = Number(existing.totalAmount) + Number(row.totalAmount);
    existing.amountPaid = Number(existing.amountPaid) + Number(row.amountPaid);
    existing.balance = Number(existing.balance) + Number(row.balance);
    existing.sourceIds.push(row.id);
    if (row.invoiceNo) existing.invoiceNos.push(row.invoiceNo);
    if (row.dueDate && existing.dueDate && new Date(row.dueDate) < new Date(existing.dueDate)) {
      existing.dueDate = row.dueDate;
    }
    if (row.status === "OVERDUE") existing.status = "OVERDUE";
  }

  return [...map.values()].sort((a, b) =>
    a.studentName.localeCompare(b.studentName) ||
    a.typeLabel.localeCompare(b.typeLabel)
  );
}

/** Charge lines: one row per fee head + installment (no course). */
export function aggregateChargesByFeeHeadAndInstallment<
  T extends MoneyLike & {
    installmentNo?: number;
    amountPaid: number;
    dueAmount: number;
  },
>(rows: T[]): Array<T & { typeLabel: string; sourceIds: string[] }> {
  const map = new Map<string, T & { typeLabel: string; sourceIds: string[] }>();

  for (const row of rows) {
    const typeLabel = normalizeFeeHeadLabel(
      row.feeHead || (row as { feeHeadMaster?: { name?: string } }).feeHeadMaster?.name,
      null
    );
    const inst = row.installmentNo || 1;
    const key = `${typeLabel}::${inst}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        feeHead: typeLabel,
        typeLabel,
        sourceIds: [row.id],
        amountPaid: Number(row.amountPaid),
        dueAmount: Number(row.dueAmount),
      });
      continue;
    }
    existing.amountPaid = Number(existing.amountPaid) + Number(row.amountPaid);
    existing.dueAmount = Number(existing.dueAmount) + Number(row.dueAmount);
    existing.sourceIds.push(row.id);
    if (row.dueDate && existing.dueDate && new Date(row.dueDate) < new Date(existing.dueDate)) {
      existing.dueDate = row.dueDate;
    }
    if (row.status === "OVERDUE") existing.status = "OVERDUE";
  }

  return [...map.values()].sort(
    (a, b) =>
      a.typeLabel.localeCompare(b.typeLabel) ||
      (a.installmentNo || 1) - (b.installmentNo || 1)
  );
}
