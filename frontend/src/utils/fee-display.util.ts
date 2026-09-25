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

/** Label for a single payment/receipt row (no summing). */
export function paymentTypeLabel(
  feeHead?: string | null,
  notes?: string | null,
  installmentNo?: number | null
): string {
  const notesText = notes || "";
  if (/application\s*fee/i.test(notesText) || /application\s*fee/i.test(feeHead || "")) {
    return "Application Fee";
  }
  // Admission "amount paid today" is not an installment due
  if (/down payment|initial\s*\/|initial payment/i.test(notesText)) {
    return "Initial payment";
  }
  const head = normalizeFeeHeadLabel(feeHead, notes);
  const inst = installmentNo && installmentNo > 0 ? installmentNo : null;
  return inst ? `${head} · Inst ${inst}` : head;
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

type InvoiceLike = MoneyLike & {
  invoiceNo?: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  pendingFee?: {
    id?: string;
    feeHead?: string | null;
    installmentNo?: number;
  } | null;
};

function invoiceInstallmentNo(row: InvoiceLike): number {
  const fromPending = row.pendingFee?.installmentNo;
  if (typeof fromPending === "number" && fromPending > 0) return fromPending;
  if (typeof row.installmentNo === "number" && row.installmentNo > 0) return row.installmentNo;
  return 1;
}

function invoiceFeeHead(row: InvoiceLike): string | null | undefined {
  return row.feeHead ?? row.pendingFee?.feeHead ?? null;
}

/**
 * Invoices: one row per student + installment + fee head
 * (same grain as Pending dues). Never shows "+N more".
 */
export function aggregateInvoicesByStudentAndInstallment<T extends InvoiceLike>(
  rows: T[]
): Array<
  T & {
    typeLabel: string;
    installmentNo: number;
    sourceIds: string[];
  }
> {
  const map = new Map<
    string,
    T & { typeLabel: string; installmentNo: number; sourceIds: string[] }
  >();

  for (const row of rows) {
    const head = normalizeFeeHeadLabel(invoiceFeeHead(row), row.notes as string | null);
    const inst = invoiceInstallmentNo(row);
    const typeLabel = /application/i.test(head) ? head : `${head} · Inst ${inst}`;
    const key = `${row.studentId || row.studentName}::${head}::${inst}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        feeHead: head,
        typeLabel,
        installmentNo: inst,
        sourceIds: [row.id],
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
    // Keep earliest due date and worst status; the lowest invoice no is the
    // one number shown for the whole installment (matches detail page + PDF).
    if (row.dueDate && existing.dueDate && new Date(row.dueDate) < new Date(existing.dueDate)) {
      existing.dueDate = row.dueDate;
    }
    if (row.status === "OVERDUE") existing.status = "OVERDUE";
    if (row.invoiceNo && (!existing.invoiceNo || row.invoiceNo < existing.invoiceNo)) {
      existing.id = row.id;
      existing.invoiceNo = row.invoiceNo;
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      a.studentName.localeCompare(b.studentName) ||
      a.typeLabel.localeCompare(b.typeLabel) ||
      a.installmentNo - b.installmentNo
  );
}

/** Receipt allocation lines: one row per fee head + installment (no course). */
export function aggregateAllocationsByFeeHeadAndInstallment(
  allocations: Array<{
    amount: number | string;
    pendingFee?: { feeHead?: string | null; installmentNo?: number | null } | null;
  }>
): Array<{ key: string; feeHead: string; installmentNo: number | null; amount: number }> {
  const map = new Map<
    string,
    { key: string; feeHead: string; installmentNo: number | null; amount: number }
  >();
  for (const a of allocations) {
    const feeHead = normalizeFeeHeadLabel(a.pendingFee?.feeHead, null);
    const installmentNo = a.pendingFee?.installmentNo ?? null;
    const key = `${feeHead}::${installmentNo ?? "-"}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += Number(a.amount);
    } else {
      map.set(key, { key, feeHead, installmentNo, amount: Number(a.amount) });
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      a.feeHead.localeCompare(b.feeHead) || (a.installmentNo ?? 0) - (b.installmentNo ?? 0)
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
    const rowDue = Number(row.dueAmount);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...row,
        feeHead: typeLabel,
        typeLabel,
        sourceIds: [row.id],
        amountPaid: Number(row.amountPaid),
        dueAmount: rowDue,
      });
      continue;
    }
    const existingHadOpenDue = Number(existing.dueAmount) > 0.009;
    existing.amountPaid = Number(existing.amountPaid) + Number(row.amountPaid);
    existing.dueAmount = Number(existing.dueAmount) + rowDue;
    existing.sourceIds.push(row.id);
    // Collect must target a line that still has due (not a paid course slice).
    if (!existingHadOpenDue && rowDue > 0.009) {
      existing.id = row.id;
      existing.status = row.status;
      existing.feeHeadMasterId =
        (row as { feeHeadMasterId?: string }).feeHeadMasterId ?? existing.feeHeadMasterId;
    }
    const rowInvoiceNo = (row as { invoiceNo?: string | null }).invoiceNo;
    const existingInvoiceNo = (existing as { invoiceNo?: string | null }).invoiceNo;
    if (rowInvoiceNo && (!existingInvoiceNo || rowInvoiceNo < existingInvoiceNo)) {
      (existing as { invoiceNo?: string | null }).invoiceNo = rowInvoiceNo;
    }
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
