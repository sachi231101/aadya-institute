import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useCreateOtherInvoice } from "@/hooks/useFees";
import { useStudentList } from "@/hooks/useStudents";
import { useMasterDropdown } from "@/hooks/useMasterDropdown";
import { useNumberingSeriesPreview } from "@/hooks/useMasters";
import { useAuthStore } from "@/store/auth.store";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MasterSelect } from "@/components/common/MasterSelect";
import { Separator } from "@/components/ui/separator";

type DiscountType = "PERCENT" | "FLAT";

type LineDraft = {
  key: string;
  feeHeadMasterId: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
  taxPercent: number;
};

type ReceiptDraft = {
  paymentModeMasterId: string;
  narration: string;
  transactionStatus: string;
  transactionDate: string;
  bankAccountMasterId: string;
  transactionRef: string;
  amount: number;
  tds: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyLine = (): LineDraft => ({
  key: newKey(),
  feeHeadMasterId: "",
  name: "",
  description: "",
  unitPrice: 0,
  quantity: 1,
  discount: 0,
  discountType: "PERCENT",
  taxPercent: 0,
});

const emptyReceipt = (): ReceiptDraft => ({
  paymentModeMasterId: "",
  narration: "",
  transactionStatus: "CLEARED",
  transactionDate: todayIso(),
  bankAccountMasterId: "",
  transactionRef: "",
  amount: 0,
  tds: 0,
});

const calcLine = (item: LineDraft) => {
  const base = Math.max(0, Number(item.quantity || 0) * Number(item.unitPrice || 0));
  const discRaw = Number(item.discount || 0);
  const disc =
    item.discountType === "PERCENT" ? (base * discRaw) / 100 : discRaw;
  const taxable = Math.max(0, base - disc);
  const tax = (taxable * Number(item.taxPercent || 0)) / 100;
  return {
    base,
    discountAmount: disc,
    taxAmount: tax,
    total: Math.max(0, taxable + tax),
  };
};

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm outline-none focus:border-primary focus:bg-background";

export const OtherInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const createInvoice = useCreateOtherInvoice();
  const user = useAuthStore((s) => s.user);
  const { options: feeHeadOptions } = useMasterDropdown("feeheads");
  const { data: invoiceSeriesData, isLoading: isInvoicePreviewLoading } =
    useNumberingSeriesPreview("OTHER_INVOICE");
  const nextInvoiceNo = invoiceSeriesData?.data?.preview;

  const [reference, setReference] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso());
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedStudentLabel, setSelectedStudentLabel] = useState("");
  const [takenByName, setTakenByName] = useState(user?.name || "");
  const [terms, setTerms] = useState("Payment due as per due date");
  const [adjustments, setAdjustments] = useState(0);
  const [comments, setComments] = useState("");
  const [items, setItems] = useState<LineDraft[]>([emptyLine()]);
  const [recordPayment, setRecordPayment] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptDraft>(emptyReceipt());
  const [error, setError] = useState<string | null>(null);

  const { data: studentsData, isLoading: studentsLoading } = useStudentList({
    search: studentSearch.trim() || undefined,
    limit: 20,
  });
  const students = useMemo(() => {
    const raw = studentsData?.data;
    return Array.isArray(raw) ? raw : [];
  }, [studentsData]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q || studentId) return [];
    return students.filter((s) => {
      const name = (s.user?.name || "").toLowerCase();
      const phone = (s.user?.phone || "").toLowerCase();
      const email = (s.user?.email || "").toLowerCase();
      const code = (s.studentCode || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        code.includes(q)
      );
    });
  }, [students, studentSearch, studentId]);

  const selectStudent = (s: (typeof students)[number]) => {
    const name = s.user?.name || "Student";
    const phone = s.user?.phone || "";
    setStudentId(s.id);
    setSelectedStudentLabel(
      `${name}${phone ? ` · ${phone}` : ""} · ${s.studentCode}`
    );
    setStudentSearch("");
  };

  const clearStudent = () => {
    setStudentId("");
    setSelectedStudentLabel("");
    setStudentSearch("");
  };

  const lineCalcs = items.map(calcLine);
  const netTotal = lineCalcs.reduce((s, c) => s + c.base, 0);
  const discountTotal = lineCalcs.reduce((s, c) => s + c.discountAmount, 0);
  const taxTotal = lineCalcs.reduce((s, c) => s + c.taxAmount, 0);
  const grandTotal = Math.max(0, netTotal - discountTotal + taxTotal + Number(adjustments || 0));
  const receivedAmount = recordPayment ? Number(receipt.amount || 0) : 0;
  const balancedAmount = Math.max(0, grandTotal - receivedAmount);

  const updateItem = (key: string, patch: Partial<LineDraft>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const setFeeHead = (key: string, feeHeadMasterId: string) => {
    const opt = feeHeadOptions.find((o) => o.value === feeHeadMasterId);
    updateItem(key, {
      feeHeadMasterId,
      name: opt?.label || "",
    });
  };

  const submit = async () => {
    setError(null);

    if (!studentId) {
      setError("Please select a student.");
      return;
    }
    if (!invoiceDate || !dueDate) {
      setError("Invoice date and payment due date are required.");
      return;
    }
    if (!takenByName.trim()) {
      setError("Invoice taken by is required.");
      return;
    }

    const validItems = items
      .map((item, idx) => ({ item, calc: lineCalcs[idx] }))
      .filter(({ item }) => item.feeHeadMasterId && item.unitPrice > 0 && item.quantity > 0);

    if (!validItems.length) {
      setError("Add at least one fee line with fee type and amount greater than 0.");
      return;
    }

    if (recordPayment && receivedAmount > 0) {
      if (!receipt.paymentModeMasterId) {
        setError("Select a payment mode for the receipt.");
        return;
      }
      if (receivedAmount - grandTotal > 0.009) {
        setError("Received amount cannot exceed grand total.");
        return;
      }
    }

    try {
      const result = await createInvoice.mutateAsync({
        studentId,
        reference: reference.trim() || undefined,
        invoiceDate,
        dueDate,
        terms: terms.trim() || undefined,
        notes: comments.trim() || undefined,
        adjustments: Number(adjustments) || undefined,
        takenByName: takenByName.trim(),
        items: validItems.map(({ item, calc }) => ({
          name: item.name || "Fee item",
          description: item.description.trim() || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount) || undefined,
          discountType: item.discountType,
          taxPercent: Number(item.taxPercent) || undefined,
          tax: calc.taxAmount || undefined,
          feeHeadMasterId: item.feeHeadMasterId,
        })),
        payment:
          recordPayment && receivedAmount > 0
            ? {
                amount: receivedAmount,
                paymentModeMasterId: receipt.paymentModeMasterId,
                bankAccountMasterId: receipt.bankAccountMasterId || undefined,
                transactionRef: receipt.transactionRef.trim() || undefined,
                transactionDate: receipt.transactionDate || invoiceDate,
                transactionStatus: receipt.transactionStatus || undefined,
                narration: receipt.narration.trim() || undefined,
                tds: Number(receipt.tds) || undefined,
              }
            : undefined,
      });

      const createdId = result.data?.id;
      navigate(
        createdId
          ? `${basePath}/fees/other-invoices/${createdId}`
          : `${basePath}/fees/invoices?tab=other`
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to create other invoice");
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2 text-text-secondary">
            <Link to={`${basePath}/fees/invoices?tab=other`}>
              <ArrowLeft className="h-4 w-4" />
              Invoices
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Other Invoice</h1>
            <p className="text-sm text-text-secondary">
              Create an ad-hoc invoice for books, kits, or miscellaneous charges.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/fees/invoices?tab=other`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={createInvoice.isPending}
            onClick={() => void submit()}
            className="min-w-24"
          >
            {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border border-border shadow-xs">
        <CardHeader className="border-b border-border bg-muted/40 px-6 pb-3 pt-4">
          <CardTitle className="text-base">Customer details</CardTitle>
          <CardDescription>Student and invoice header information</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Invoice #</Label>
            <Input
              value={
                isInvoicePreviewLoading
                  ? "Loading..."
                  : nextInvoiceNo || "Configure OTHER_INVOICE series in Masters"
              }
              disabled
              className="rounded-xl bg-muted/50 font-mono font-medium"
            />
            {nextInvoiceNo ? (
              <p className="text-[11px] text-text-secondary">
                From Master Numbering Series · assigned on save
                {typeof invoiceSeriesData?.data?.nextSequence === "number"
                  ? ` · #${invoiceSeriesData.data.nextSequence}`
                  : ""}
              </p>
            ) : !isInvoicePreviewLoading ? (
              <p className="text-[11px] text-amber-600">
                Set pattern under Masters → Numbering Series → OTHER_INVOICE
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Reference #</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Invoice date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Customer type</Label>
            <Input value="Student" disabled className="rounded-xl bg-muted/50" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>
              Student <span className="text-red-500">*</span>
            </Label>

            {studentId && selectedStudentLabel ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {selectedStudentLabel}
                  </p>
                  <p className="text-xs text-text-secondary">Selected student</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={clearStudent}
                  title="Change student"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or phone number..."
                    className="rounded-xl pl-9"
                    autoComplete="off"
                  />
                </div>

                {studentsLoading && studentSearch.trim() ? (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-text-secondary">
                    Searching students...
                  </div>
                ) : null}

                {!studentsLoading &&
                studentSearch.trim() &&
                filteredStudents.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-text-secondary">
                    No students found for “{studentSearch.trim()}”
                  </div>
                ) : null}

                {filteredStudents.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
                    {filteredStudents.map((s) => {
                      const name = s.user?.name || "Student";
                      const phone = s.user?.phone || "—";
                      const email = s.user?.email || "";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectStudent(s)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {name}
                            </p>
                            <p className="truncate text-xs text-text-secondary font-mono">
                              {s.studentCode} · {phone}
                              {email ? ` · ${email}` : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>
              Invoice taken by <span className="text-red-500">*</span>
            </Label>
            <Input
              value={takenByName}
              onChange={(e) => setTakenByName(e.target.value)}
              placeholder="Staff name"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Payment due date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/40 px-6 pb-3 pt-4">
          <div>
            <CardTitle className="text-base">Product / services / fees</CardTitle>
            <CardDescription>Add one or more charge lines</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setItems((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {items.map((item, idx) => {
            const calc = lineCalcs[idx];
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-border/80 bg-background p-4 shadow-xs"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">Line {idx + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={items.length <= 1}
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>
                      Fee type <span className="text-red-500">*</span>
                    </Label>
                    <MasterSelect
                      entityType="feeheads"
                      value={item.feeHeadMasterId}
                      onChange={(v) => setFeeHead(item.key, v)}
                      placeholder="Select fees type..."
                      className="mt-0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateItem(item.key, { unitPrice: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Qty / hours</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.key, { quantity: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.discount || ""}
                      onChange={(e) =>
                        updateItem(item.key, { discount: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Discount type</Label>
                    <select
                      value={item.discountType}
                      onChange={(e) =>
                        updateItem(item.key, {
                          discountType: e.target.value as DiscountType,
                        })
                      }
                      className={fieldClass}
                    >
                      <option value="PERCENT">%</option>
                      <option value="FLAT">Flat</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax</Label>
                    <select
                      value={String(item.taxPercent)}
                      onChange={(e) =>
                        updateItem(item.key, { taxPercent: Number(e.target.value) || 0 })
                      }
                      className={fieldClass}
                    >
                      <option value="0">None</option>
                      <option value="5">GST 5%</option>
                      <option value="12">GST 12%</option>
                      <option value="18">GST 18%</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Line total</Label>
                    <Input
                      value={formatMoney(calc.total)}
                      disabled
                      className="rounded-xl bg-muted/50 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.key, { description: e.target.value })}
                      placeholder="Enter description"
                      rows={2}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Separator />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Terms & conditions</Label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className={`${fieldClass} mb-2`}
              >
                <option value="Payment due as per due date">Payment due as per due date</option>
                <option value="Fees once paid are non-refundable">
                  Fees once paid are non-refundable
                </option>
                <option value="Subject to institute terms & conditions">
                  Subject to institute terms & conditions
                </option>
              </select>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <h3 className="mb-3 text-sm font-semibold">Billing details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Net total</span>
                  <span className="font-medium">{formatMoney(netTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Discount</span>
                  <span className="font-medium">{formatMoney(discountTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Taxes</span>
                  <span className="font-medium">{formatMoney(taxTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-text-secondary">Adjustments</span>
                  <Input
                    type="number"
                    className="h-9 w-32 rounded-xl"
                    value={adjustments || ""}
                    onChange={(e) => setAdjustments(Number(e.target.value) || 0)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Grand total</span>
                  <span>{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-border shadow-xs">
        <CardHeader className="border-b border-border bg-muted/40 px-6 pb-3 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Receipt details</CardTitle>
              <CardDescription>Optional — record a desk payment while saving</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={recordPayment} onCheckedChange={setRecordPayment} id="record-pay" />
              <Label htmlFor="record-pay" className="cursor-pointer">
                Record payment now
              </Label>
            </div>
          </div>
        </CardHeader>

        {recordPayment ? (
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs text-text-secondary">Received amount</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {formatMoney(receivedAmount)}
                </p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs text-text-secondary">Balance amount</p>
                <p className="text-lg font-semibold text-amber-700">
                  {formatMoney(balancedAmount)}
                </p>
              </div>
              <div className="rounded-xl border bg-background p-3 sm:col-span-1">
                <p className="text-xs text-text-secondary">Invoice total</p>
                <p className="text-lg font-semibold">{formatMoney(grandTotal)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label>
                  Payment mode <span className="text-red-500">*</span>
                </Label>
                <MasterSelect
                  entityType="paymentmodes"
                  value={receipt.paymentModeMasterId}
                  onChange={(v) => setReceipt((r) => ({ ...r, paymentModeMasterId: v }))}
                  placeholder="Select payment mode..."
                  className="mt-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Transaction / cheque status</Label>
                <select
                  value={receipt.transactionStatus}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, transactionStatus: e.target.value }))
                  }
                  className={fieldClass}
                >
                  <option value="CLEARED">Cleared</option>
                  <option value="PENDING">Pending</option>
                  <option value="BOUNCED">Bounced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Transaction / cheque date</Label>
                <Input
                  type="date"
                  value={receipt.transactionDate}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, transactionDate: e.target.value }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deposited to</Label>
                <MasterSelect
                  entityType="bankaccounts"
                  value={receipt.bankAccountMasterId}
                  onChange={(v) => setReceipt((r) => ({ ...r, bankAccountMasterId: v }))}
                  placeholder="Select account..."
                  className="mt-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Transaction number</Label>
                <Input
                  value={receipt.transactionRef}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, transactionRef: e.target.value }))
                  }
                  placeholder="Txn / cheque no"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={receipt.amount || ""}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, amount: Number(e.target.value) || 0 }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>TDS</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={receipt.tds || ""}
                  onChange={(e) =>
                    setReceipt((r) => ({ ...r, tds: Number(e.target.value) || 0 }))
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Narration</Label>
                <Textarea
                  value={receipt.narration}
                  onChange={(e) => setReceipt((r) => ({ ...r, narration: e.target.value }))}
                  placeholder="Enter narration"
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Comments</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Internal remarks"
                rows={2}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-6">
            <p className="text-sm text-text-secondary">
              Payment recording is off. You can save the invoice now and collect payment later from
              Payments or the invoice detail page.
            </p>
            <div className="mt-3 space-y-1.5">
              <Label>Comments</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Internal remarks"
                rows={2}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`${basePath}/fees/invoices?tab=other`)}
        >
          Cancel
        </Button>
        <Button type="button" disabled={createInvoice.isPending} onClick={() => void submit()}>
          {createInvoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save invoice"}
        </Button>
      </div>
    </div>
  );
};
