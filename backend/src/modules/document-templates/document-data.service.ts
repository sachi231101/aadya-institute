import { prisma } from "../../config/database";
import { formatOrganizationDate, type OrganizationDateFormat } from "../../utils/date";
import { resolveDisplayOrganizationInfo } from "../../utils/organization-display.util";
import { toMoneyNumber } from "../fees/fee-money.util";
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
          pendingFee: { select: { feeHead: true, installmentNo: true, dueAmount: true } },
          studentInvoice: { select: { invoiceNo: true, invoiceDate: true } },
        },
      },
    },
  });
  if (!payment) return null;

  const ctx = buildDisplayContext(payment.institute, payment.branch);
  const amount = toMoneyNumber(payment.amount);

  const invoiceRows = payment.allocations.map((allocation) => [
    allocation.studentInvoice?.invoiceNo ?? "",
    payment.courseName ?? "",
    allocation.pendingFee?.feeHead ?? payment.feeHead ?? "Fee",
    ctx.formatDate(allocation.studentInvoice?.invoiceDate ?? payment.date),
    plain(toMoneyNumber(allocation.pendingFee?.dueAmount ?? allocation.amount)),
    plain(toMoneyNumber(allocation.amount)),
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

  let totalDue = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  const installmentRows = installments.map((fee) => {
    const due = toMoneyNumber(fee.totalFee);
    const paid = toMoneyNumber(fee.amountPaid);
    const balance = toMoneyNumber(fee.dueAmount);
    totalDue += due;
    totalPaid += paid;
    totalBalance += balance;
    const details = fee.allocations
      .map((allocation) => {
        const linked = allocation.payment;
        if (!linked) return "";
        return [
          linked.receiptNo,
          ctx.formatDate(linked.date),
          plain(toMoneyNumber(linked.amount)),
          linked.method,
        ]
          .filter(Boolean)
          .join(" ");
      })
      .filter(Boolean)
      .join(", ");
    return [ctx.formatDate(fee.dueDate), plain(due), plain(paid), plain(balance), details];
  });

  return {
    ...ctx.header,
    receiptNo: payment.receiptNo,
    date: ctx.formatDate(payment.date),
    studentName: payment.studentName,
    admissionNo: payment.admissionNo,
    courseName: payment.courseName,
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
      payment.allocations.length > 0
        ? payment.allocations.map((allocation) => [
            allocation.pendingFee?.feeHead ?? payment.feeHead ?? "Fee",
            ctx.money(toMoneyNumber(allocation.amount)),
          ])
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

  const invoice = await prisma.studentInvoice.findUnique({
    where: { id },
    include: {
      institute: true,
      branch: { select: { name: true, address: true, phone: true, email: true, timezone: true } },
      otherInvoice: { select: { reference: true, items: { orderBy: { sortOrder: "asc" } } } },
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
  });
  if (!invoice) return null;

  const ctx = buildDisplayContext(invoice.institute, invoice.branch);
  const total = toMoneyNumber(invoice.totalAmount);

  const itemRows = invoice.otherInvoice?.items?.length
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

  let paidTotal = 0;
  const transactionRows = invoice.allocations
    .filter((allocation) => Boolean(allocation.payment))
    .map((allocation, index) => {
      const amount = toMoneyNumber(allocation.amount);
      paidTotal += amount;
      return [
        String(index + 1),
        ctx.formatDate(allocation.payment?.date),
        allocation.payment?.method ?? "",
        allocation.payment?.transactionRef ?? "",
        plain(amount),
        "0",
        plain(amount),
      ];
    });

  return {
    ...ctx.header,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: ctx.formatDate(invoice.invoiceDate),
    dueDate: ctx.formatDate(invoice.dueDate),
    referenceNo: invoice.otherInvoice?.reference ?? "",
    placeOfSupply: "",
    studentName: invoice.studentName,
    studentAddress: "",
    admissionNo: invoice.admissionNo,
    courseName: invoice.courseName,
    subtotal: plain(total),
    adjustment: "0",
    discount: "0",
    tax: "0",
    grandTotal: plain(total),
    amountPaid: plain(toMoneyNumber(invoice.amountPaid)),
    balance: plain(toMoneyNumber(invoice.balance)),
    terms: "",
    notes: invoice.notes ?? "",
    itemRows: table(itemRows),
    lineItems: table(itemRows.map((row) => [row[0] ?? "", row[2] ?? "", row[3] ?? "", row[4] ?? ""])),
    transactionRows: table(transactionRows, ["", "", "", "", "", "Total", plain(paidTotal)]),
  };
};
