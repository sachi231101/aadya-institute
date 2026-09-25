import { prisma } from "../../config/database";
import { formatOrganizationDate, type OrganizationDateFormat } from "../../utils/date";
import { resolveDisplayOrganizationInfo } from "../../utils/organization-display.util";
import { toMoneyNumber } from "../fees/fee-money.util";
import { FeeRepository } from "../fees/fee.repository";
import { toOrganizationContext } from "../organization/organization.mapper";
import type { DocumentRenderData, DocumentTableData } from "./document-template.types";

export type InvoiceKind = "STUDENT" | "OTHER";

const moneyFormatter = (currency: string) => {
  const symbol = currency === "INR" ? "\u20B9" : `${currency} `;
  return (value: number): string =>
    `${symbol}${value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
};

const plain = (value: number): string =>
  value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

const table = (rows: string[][], totals?: string[]): DocumentTableData => ({
  rows,
  ...(totals ? { totals } : {}),
});

const pushUnique = (list: string[], value: string | null | undefined) => {
  if (value && !list.includes(value)) list.push(value);
};

const installmentLabel = (feeHead: string, installmentNo?: number | null) =>
  installmentNo && installmentNo > 0 ? `${feeHead} · Inst ${installmentNo}` : feeHead;

interface DisplayContext {
  header: DocumentRenderData;
  formatDate: (value: Date | string | null | undefined) => string;
  money: (value: number) => string;
}

const buildDisplayContext = (
  institute: unknown,
  branch: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    timezone?: string | null;
  } | null
): DisplayContext => {
  const organization = toOrganizationContext(institute as never);
  const display = resolveDisplayOrganizationInfo({
    organization,
    branch,
    mode: branch ? "branch" : "organization",
  });

  const addressLine = [
    display.address,
    [display.city, display.state, display.postalCode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const dateFormat = display.dateFormat as OrganizationDateFormat;

  return {
    header: {
      instituteName: display.name,
      address: addressLine,
      phone: display.phone ? `Mobile No ${display.phone}` : "",
      email: display.email ? `Email ID :- ${display.email}` : "",
      gstNumber: display.gstNumber ?? "",
      logo: display.logoUrl ?? "",
    },
    formatDate: (value) =>
      value ? formatOrganizationDate(value, dateFormat, display.timezone) : "",
    money: moneyFormatter(display.currency),
  };
};

/** Values for a fee receipt, keyed by Canvas block binding. */
export const buildReceiptData = async (
  paymentId: string
): Promise<DocumentRenderData | null> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      institute: true,
      branch: { select: { name: true, address: true, phone: true, email: true, timezone: true } },
      student: { select: { studentCode: true } },
      bankAccountMaster: { select: { name: true } },
      allocations: {
        include: {
          pendingFee: {
            select: {
              feeHead: true,
              feeHeadMasterId: true,
              installmentNo: true,
              dueAmount: true,
              courseName: true,
            },
          },
          studentInvoice: { select: { invoiceNo: true, invoiceDate: true } },
        },
      },
    },
  });
  if (!payment) return null;

  const ctx = buildDisplayContext(payment.institute, payment.branch);
  const amount = toMoneyNumber(payment.amount);

  // A multi-course student has one charge line per course for the same
  // installment; print them as a single "Fee head · Inst N" line.
  const paidGroups = new Map<
    string,
    {
      label: string;
      invoiceNos: string[];
      courses: string[];
      invoiceDate: Date | null;
      due: number;
      paid: number;
    }
  >();
  for (const allocation of payment.allocations) {
    const pf = allocation.pendingFee;
    const head = pf?.feeHead ?? payment.feeHead ?? "Fee";
    const key = `${pf?.feeHeadMasterId ?? head}::${pf?.installmentNo ?? 0}`;
    const group = paidGroups.get(key) ?? {
      label: installmentLabel(head, pf?.installmentNo),
      invoiceNos: [],
      courses: [],
      invoiceDate: allocation.studentInvoice?.invoiceDate ?? null,
      due: 0,
      paid: 0,
    };
    pushUnique(group.invoiceNos, allocation.studentInvoice?.invoiceNo);
    pushUnique(group.courses, pf?.courseName ?? payment.courseName);
    group.due += toMoneyNumber(pf?.dueAmount ?? allocation.amount);
    group.paid += toMoneyNumber(allocation.amount);
    paidGroups.set(key, group);
  }

  const invoiceRows = [...paidGroups.values()].map((group) => [
    [...group.invoiceNos].sort()[0] ?? "",
    group.courses.join(", "),
    group.label,
    ctx.formatDate(group.invoiceDate ?? payment.date),
    plain(group.due),
    plain(group.paid),
  ]);

  if (invoiceRows.length === 0) {
    invoiceRows.push([
      "",
      payment.courseName ?? "",
      payment.feeHead ?? "Fee",
      ctx.formatDate(payment.date),
      plain(amount),
      plain(amount),
    ]);
  }

  const installments = payment.studentId
    ? await prisma.pendingFee.findMany({
        where: { studentId: payment.studentId, instituteId: payment.instituteId },
        orderBy: [{ dueDate: "asc" }, { installmentNo: "asc" }],
        include: {
          allocations: {
            include: {
              payment: { select: { receiptNo: true, date: true, amount: true, method: true } },
            },
          },
        },
      })
    : [];

  const scheduleGroups = new Map<
    string,
    { dueDate: Date; due: number; paid: number; balance: number; receipts: string[] }
  >();
  const courseNames: string[] = [];
  for (const fee of installments) {
    pushUnique(courseNames, fee.courseName);
    const key = `${fee.feeHeadMasterId ?? fee.feeHead ?? "fee"}::${fee.installmentNo}`;
    const group = scheduleGroups.get(key) ?? {
      dueDate: fee.dueDate,
      due: 0,
      paid: 0,
      balance: 0,
      receipts: [],
    };
    if (fee.dueDate < group.dueDate) group.dueDate = fee.dueDate;
    group.due += toMoneyNumber(fee.totalFee);
    group.paid += toMoneyNumber(fee.amountPaid);
    group.balance += toMoneyNumber(fee.dueAmount);
    for (const allocation of fee.allocations) {
      const linked = allocation.payment;
      if (!linked) continue;
      pushUnique(
        group.receipts,
        [linked.receiptNo, ctx.formatDate(linked.date), plain(toMoneyNumber(linked.amount)), linked.method]
          .filter(Boolean)
          .join(" ")
      );
    }
    scheduleGroups.set(key, group);
  }

  let totalDue = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  const installmentRows = [...scheduleGroups.values()]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .map((group) => {
      totalDue += group.due;
      totalPaid += group.paid;
      totalBalance += group.balance;
      return [
        ctx.formatDate(group.dueDate),
        plain(group.due),
        plain(group.paid),
        plain(group.balance),
        group.receipts.join(", "),
      ];
    });

  return {
    ...ctx.header,
    receiptNo: payment.receiptNo,
    date: ctx.formatDate(payment.date),
    studentName: payment.studentName,
    admissionNo: payment.admissionNo,
    courseName: courseNames.length > 0 ? courseNames.join(", ") : payment.courseName,
    method: payment.method,
    transactionRef: payment.transactionRef ?? "",
    chequeNumber: payment.transactionRef ?? "",
    receivedIn: payment.bankAccountMaster?.name ?? payment.method,
    receivedFee: plain(amount),
    amount: ctx.money(amount),
    notes: payment.notes ?? "",
    idCardNo: payment.student?.studentCode ?? "",
    studentAddress: "",
    invoiceRows: table(invoiceRows),
    feeLines: table(
      paidGroups.size > 0
        ? [...paidGroups.values()].map((group) => [group.label, ctx.money(group.paid)])
        : [[payment.feeHead ?? "Fee payment", ctx.money(amount)]]
    ),
    installmentRows: table(installmentRows, [
      "",
      plain(totalDue),
      plain(totalPaid),
      plain(totalBalance),
      "",
    ]),
  };
};

const lineItemsFromJson = (value: unknown): string[][] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const name = String(item.name ?? item.feeHead ?? item.description ?? "");
    const qty = item.quantity != null ? plain(toMoneyNumber(item.quantity)) : "1";
    const rate = plain(toMoneyNumber(item.unitPrice ?? item.amount ?? 0));
    const total = plain(toMoneyNumber(item.lineTotal ?? item.amount ?? 0));
    return [name, "", qty, rate, total];
  });
};

/** Values for a student or other invoice, keyed by Canvas block binding. */
export const buildInvoiceData = async (
  kind: InvoiceKind,
  id: string
): Promise<DocumentRenderData | null> => {
  if (kind === "OTHER") {
    const invoice = await prisma.otherInvoice.findUnique({
      where: { id },
      include: {
        institute: true,
        branch: { select: { name: true, address: true, phone: true, email: true, timezone: true } },
        items: { orderBy: { sortOrder: "asc" } },
        pendingFees: {
          include: {
            allocations: {
              include: {
                payment: {
                  select: {
                    receiptNo: true,
                    date: true,
                    amount: true,
                    method: true,
                    transactionRef: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!invoice) return null;

    const ctx = buildDisplayContext(invoice.institute, invoice.branch);
    const itemRows = invoice.items.map((item) => [
      item.name,
      "",
      plain(toMoneyNumber(item.quantity)),
      plain(toMoneyNumber(item.unitPrice)),
      plain(toMoneyNumber(item.lineTotal)),
    ]);

    const payments = invoice.pendingFees
      .flatMap((fee) => fee.allocations)
      .filter((allocation) => Boolean(allocation.payment))
      .map((allocation) => ({
        amount: toMoneyNumber(allocation.amount),
        date: allocation.payment?.date ?? null,
        method: allocation.payment?.method ?? "",
        transactionRef: allocation.payment?.transactionRef ?? "",
      }));

    let paidTotal = 0;
    const transactionRows = payments.map((entry, index) => {
      paidTotal += entry.amount;
      return [
        String(index + 1),
        ctx.formatDate(entry.date),
        entry.method,
        entry.transactionRef,
        plain(entry.amount),
        "0",
        plain(entry.amount),
      ];
    });

    return {
      ...ctx.header,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: ctx.formatDate(invoice.invoiceDate),
      dueDate: ctx.formatDate(invoice.dueDate),
      referenceNo: invoice.reference ?? "",
      placeOfSupply: "",
      studentName: invoice.studentName,
      studentAddress: "",
      admissionNo: invoice.admissionNo,
      courseName: invoice.courseName ?? "",
      subtotal: plain(toMoneyNumber(invoice.subtotal)),
      adjustment: plain(toMoneyNumber(invoice.adjustments)),
      discount: plain(toMoneyNumber(invoice.discount)),
      tax: plain(toMoneyNumber(invoice.tax)),
      grandTotal: plain(toMoneyNumber(invoice.grandTotal)),
      amountPaid: plain(toMoneyNumber(invoice.amountPaid)),
      balance: plain(toMoneyNumber(invoice.balance)),
      terms: invoice.terms ?? "",
      notes: invoice.notes ?? "",
      itemRows: table(itemRows),
      lineItems: table(itemRows.map((row) => [row[0] ?? "", row[2] ?? "", row[3] ?? "", row[4] ?? ""])),
      transactionRows: table(transactionRows, ["", "", "", "", "", "Total", plain(paidTotal)]),
    };
  }

  const allocationInclude = {
    include: {
      payment: {
        select: {
          id: true,
          receiptNo: true,
          date: true,
          amount: true,
          method: true,
          transactionRef: true,
        },
      },
    },
  } as const;

  const invoice = await prisma.studentInvoice.findUnique({
    where: { id },
    include: {
      institute: true,
      branch: { select: { name: true, address: true, phone: true, email: true, timezone: true } },
      otherInvoice: { select: { reference: true, items: { orderBy: { sortOrder: "asc" } } } },
      pendingFee: { select: { feeHead: true, feeHeadMasterId: true, installmentNo: true } },
      allocations: allocationInclude,
    },
  });
  if (!invoice) return null;

  const ctx = buildDisplayContext(invoice.institute, invoice.branch);

  // Same student + fee head + installment across courses prints as one invoice.
  const siblingIds =
    invoice.pendingFee && invoice.studentId && !invoice.otherInvoiceId && invoice.status !== "CANCELLED"
      ? await FeeRepository.findSameInstallmentInvoiceIds({
          instituteId: invoice.instituteId,
          excludeId: invoice.id,
          studentId: invoice.studentId,
          feeHeadMasterId: invoice.pendingFee.feeHeadMasterId,
          installmentNo: invoice.pendingFee.installmentNo,
        })
      : [];
  const siblings = siblingIds.length
    ? await prisma.studentInvoice.findMany({
        where: { id: { in: siblingIds } },
        include: { allocations: allocationInclude },
      })
    : [];
  const all = [invoice, ...siblings];
  const combined = siblings.length > 0;

  const total = all.reduce((s, inv) => s + toMoneyNumber(inv.totalAmount), 0);
  const amountPaid = all.reduce((s, inv) => s + toMoneyNumber(inv.amountPaid), 0);
  const balance = all.reduce((s, inv) => s + toMoneyNumber(inv.balance), 0);
  const courseNames: string[] = [];
  for (const inv of all) pushUnique(courseNames, inv.courseName);

  const itemRows = combined
    ? [
        [
          installmentLabel(
            invoice.pendingFee?.feeHead ?? invoice.feeHead ?? "Fee",
            invoice.pendingFee?.installmentNo
          ),
          "",
          "1",
          plain(total),
          plain(total),
        ],
      ]
    : invoice.otherInvoice?.items?.length
      ? invoice.otherInvoice.items.map((item) => [
          item.name,
          "",
          plain(toMoneyNumber(item.quantity)),
          plain(toMoneyNumber(item.unitPrice)),
          plain(toMoneyNumber(item.lineTotal)),
        ])
      : lineItemsFromJson(invoice.lineItems);

  if (itemRows.length === 0) {
    itemRows.push([invoice.feeHead ?? invoice.courseName, "", "1", plain(total), plain(total)]);
  }

  const paymentsById = new Map<
    string,
    { date: Date | null; method: string; transactionRef: string; amount: number }
  >();
  for (const allocation of all.flatMap((inv) => inv.allocations)) {
    if (!allocation.payment) continue;
    const existing = paymentsById.get(allocation.payment.id);
    if (existing) {
      existing.amount += toMoneyNumber(allocation.amount);
    } else {
      paymentsById.set(allocation.payment.id, {
        date: allocation.payment.date,
        method: allocation.payment.method ?? "",
        transactionRef: allocation.payment.transactionRef ?? "",
        amount: toMoneyNumber(allocation.amount),
      });
    }
  }

  let paidTotal = 0;
  const transactionRows = [...paymentsById.values()].map((entry, index) => {
    paidTotal += entry.amount;
    return [
      String(index + 1),
      ctx.formatDate(entry.date),
      entry.method,
      entry.transactionRef,
      plain(entry.amount),
      "0",
      plain(entry.amount),
    ];
  });

  return {
    ...ctx.header,
    invoiceNo: all.map((inv) => inv.invoiceNo).sort()[0],
    invoiceDate: ctx.formatDate(invoice.invoiceDate),
    dueDate: ctx.formatDate(invoice.dueDate),
    referenceNo: invoice.otherInvoice?.reference ?? "",
    placeOfSupply: "",
    studentName: invoice.studentName,
    studentAddress: "",
    admissionNo: invoice.admissionNo,
    courseName: courseNames.join(", "),
    subtotal: plain(total),
    adjustment: "0",
    discount: "0",
    tax: "0",
    grandTotal: plain(total),
    amountPaid: plain(amountPaid),
    balance: plain(balance),
    terms: "",
    notes: invoice.notes ?? "",
    itemRows: table(itemRows),
    lineItems: table(itemRows.map((row) => [row[0] ?? "", row[2] ?? "", row[3] ?? "", row[4] ?? ""])),
    transactionRows: table(transactionRows, ["", "", "", "", "", "Total", plain(paidTotal)]),
  };
};
