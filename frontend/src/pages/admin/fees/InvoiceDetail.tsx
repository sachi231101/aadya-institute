import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertCircle,
  Printer,
  Ban,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  useFeeInvoice,
  useCancelFeeInvoice,
  useDownloadInvoicePdf,
  useEnsureInvoicePdf,
} from "@/hooks/useFees";
import { openPdfBlob, pdfErrorMessage } from "@/utils/pdf-blob";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { PageContainer, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();
  const cancelInvoice = useCancelFeeInvoice();
  const downloadPdf = useDownloadInvoicePdf();
  const regeneratePdf = useEnsureInvoicePdf();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [busy, setBusy] = useState<"download" | "print" | "regenerate" | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useFeeInvoice(id);
  const invoice = data?.data;

  const runPdf = async (mode: "download" | "print") => {
    if (!id || !invoice) return;
    setBusy(mode);
    setPdfError(null);
    try {
      const blob = await downloadPdf.mutateAsync(id);
      await openPdfBlob(blob, mode, `${invoice.invoiceNo || id}.pdf`);
    } catch (err: unknown) {
      setPdfError(pdfErrorMessage(err, "Failed to prepare invoice PDF"));
    } finally {
      setBusy(null);
    }
  };

  const handleRegenerate = async () => {
    if (!id) return;
    setBusy("regenerate");
    setPdfError(null);
    try {
      await regeneratePdf.mutateAsync({ id, force: true });
      void refetch();
    } catch (err: unknown) {
      setPdfError(pdfErrorMessage(err, "Failed to regenerate invoice PDF"));
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    await cancelInvoice.mutateAsync({ id, reason: cancelReason || undefined });
    setShowCancel(false);
    void refetch();
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading invoice...
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="py-16 text-center text-red-600">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Failed to load invoice.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const canCancel =
    invoice.status !== "CANCELLED" && (invoice.amountPaid || 0) <= 0 && invoice.balance > 0;

  return (
    <PageContainer maxWidth="narrow" className="print:space-y-4">
      <PageHeader
        className="print:hidden"
        title={<span className="font-mono">{invoice.invoiceNo}</span>}
        description={
          <>
            <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2 mb-1">
              <Link to={`${basePath}/fees/invoices`}>
                <ArrowLeft className="h-4 w-4" /> Invoices
              </Link>
            </Button>
            <span className="block">
              <p className="text-sm text-text-secondary">
                {invoice.studentName} · {invoice.admissionNo}
              </p>
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {invoice.studentId && invoice.balance > 0 && invoice.status !== "CANCELLED" && (
              <Button asChild className="gap-2">
                <Link to={`${basePath}/fees/payments?studentId=${invoice.studentId}`}>
                  <CreditCard className="h-4 w-4" /> Record Payment
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => void handleRegenerate()}
            >
              {busy === "regenerate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => void runPdf("download")}
            >
              {busy === "download" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => void runPdf("print")}
            >
              {busy === "print" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Print PDF
            </Button>
            {canCancel && (
              <PermissionGate itemKey="fees.invoices" mode="write">
                <Button
                  variant="destructive"
                  onClick={() => setShowCancel(true)}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

      {pdfError ? <p className="text-sm text-red-600 print:hidden">{pdfError}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Total</p>
            <p className="text-lg font-bold">{formatMoney(invoice.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Paid</p>
            <p className="text-lg font-bold">{formatMoney(invoice.amountPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Balance</p>
            <p className="text-lg font-bold">{formatMoney(invoice.balance)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Status</p>
            <Badge variant={invoice.status === "OVERDUE" ? "destructive" : "outline"}>
              {invoice.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Invoice details</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-secondary">Course:</span> {invoice.courseName}
            </div>
            <div>
              <span className="text-text-secondary">Fee head:</span> {invoice.feeHead || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Invoice date:</span>{" "}
              {formatOrgDate(invoice.invoiceDate)}
            </div>
            <div>
              <span className="text-text-secondary">Due date:</span>{" "}
              {formatOrgDate(invoice.dueDate)}
            </div>
            {(invoice.courseInvoices?.length ?? 0) > 1 && (
              <div className="sm:col-span-2">
                <span className="text-text-secondary">Includes invoices:</span>{" "}
                {invoice.courseInvoices!.map((ci) => ci.invoiceNo).join(", ")}
              </div>
            )}
            {invoice.notes && (
              <div className="sm:col-span-2">
                <span className="text-text-secondary">Notes:</span> {invoice.notes}
              </div>
            )}
            {invoice.cancelReason && (
              <div className="sm:col-span-2 text-red-600">
                Cancelled: {invoice.cancelReason}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Payment allocations</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!invoice.allocations?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-text-secondary">
                    No payments allocated yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoice.allocations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">
                      {a.payment?.receiptNo || "—"}
                    </TableCell>
                    <TableCell className="font-bold">{formatMoney(a.amount)}</TableCell>
                    <TableCell>
                      {a.payment?.date ? formatOrgDate(a.payment.date) : "—"}
                    </TableCell>
                    <TableCell>{a.payment?.method || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.payment?.status || "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showCancel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:hidden">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Cancel invoice</h3>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Cancellation reason"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCancel(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  disabled={cancelInvoice.isPending}
                  onClick={() => void handleCancel()}
                >
                  {cancelInvoice.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm cancel"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};
