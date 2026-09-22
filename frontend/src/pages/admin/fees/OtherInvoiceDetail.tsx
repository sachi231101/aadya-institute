import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertCircle,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";
import {
  useOtherInvoice,
  useDownloadOtherInvoicePdf,
  useEnsureOtherInvoicePdf,
} from "@/hooks/useFees";
import { openPdfBlob, pdfErrorMessage } from "@/utils/pdf-blob";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const OtherInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();

  const downloadPdf = useDownloadOtherInvoicePdf();
  const regeneratePdf = useEnsureOtherInvoicePdf();
  const [busy, setBusy] = useState<"download" | "print" | "regenerate" | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useOtherInvoice(id);
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

  if (isLoading) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading other invoice...
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="py-16 text-center text-red-600">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Failed to load other invoice.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link to={`${basePath}/fees/invoices?tab=other`}>
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
      </Button>
      <PageHeader
        title={<span className="font-mono">{invoice.invoiceNo}</span>}
        description={`${invoice.studentName} · ${invoice.admissionNo}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {invoice.studentId && invoice.balance > 0 && invoice.status !== "CANCELLED" ? (
              <Button asChild className="gap-2">
                <Link to={`${basePath}/fees/payments?studentId=${invoice.studentId}`}>
                  <CreditCard className="h-4 w-4" /> Record Payment
                </Link>
              </Button>
            ) : null}
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
          </div>
        }
      />

      {pdfError ? <p className="text-sm text-red-600">{pdfError}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Grand total</p>
            <p className="text-lg font-bold">{formatMoney(invoice.grandTotal)}</p>
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
            <Badge variant="outline">{invoice.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3 text-sm">
          <h3 className="font-semibold">Overview</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <span className="text-text-secondary">Course:</span> {invoice.courseName || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Reference:</span> {invoice.reference || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Invoice date:</span>{" "}
              {formatOrgDate(invoice.invoiceDate)}
            </div>
            <div>
              <span className="text-text-secondary">Due date:</span>{" "}
              {invoice.dueDate ? formatOrgDate(invoice.dueDate) : "—"}
            </div>
            <div>
              <span className="text-text-secondary">Taken by:</span>{" "}
              {invoice.takenByName || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Subtotal:</span>{" "}
              {formatMoney(invoice.subtotal)}
            </div>
            <div>
              <span className="text-text-secondary">Discount / Tax:</span>{" "}
              {formatMoney(invoice.discount)} / {formatMoney(invoice.tax)}
            </div>
            <div>
              <span className="text-text-secondary">Adjustments:</span>{" "}
              {formatMoney(invoice.adjustments || 0)}
            </div>
            {invoice.terms && (
              <div className="sm:col-span-2">
                <span className="text-text-secondary">Terms:</span> {invoice.terms}
              </div>
            )}
            {invoice.notes && (
              <div className="sm:col-span-2">
                <span className="text-text-secondary">Notes:</span> {invoice.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Line items</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.items || []).map((item, idx) => (
                <TableRow key={item.id || idx}>
                  <TableCell>
                    <div>{item.name}</div>
                    {item.description ? (
                      <div className="text-xs text-text-secondary">{item.description}</div>
                    ) : null}
                    {item.feeHead && (
                      <div className="text-xs text-text-secondary">{item.feeHead}</div>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell>{formatMoney(item.discount || 0)}</TableCell>
                  <TableCell>{formatMoney(item.tax || 0)}</TableCell>
                  <TableCell className="font-bold">
                    {formatMoney(
                      item.lineTotal ??
                        item.quantity * item.unitPrice - (item.discount || 0) + (item.tax || 0)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!!invoice.studentInvoices?.length && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Linked student invoices</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.studentInvoices.map((si) => (
                  <TableRow key={si.id}>
                    <TableCell>
                      <Link
                        to={`${basePath}/fees/invoices/${si.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {si.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell>{formatMoney(si.totalAmount)}</TableCell>
                    <TableCell>{formatMoney(si.balance)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{si.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
};
