import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Loader2,
  AlertCircle,
  Printer,
  Receipt,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useFeeReceipt, useDownloadReceiptPdf, useEnsureReceiptPdf } from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeeToastBanner, useFeeToast } from "./FeeToast";

async function openPdfBlob(blob: Blob, mode: "download" | "print", filename: string) {
  const url = URL.createObjectURL(blob);
  if (mode === "download") {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.focus();
        win.print();
      });
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();
  const downloadPdf = useDownloadReceiptPdf();
  const ensurePdf = useEnsureReceiptPdf();
  const { toast, showToast, clearToast } = useFeeToast();
  const [busy, setBusy] = useState<"download" | "print" | "regenerate" | null>(null);

  const { data, isLoading, isError, refetch } = useFeeReceipt(id);
  const receipt = data?.data;

  const runPdf = async (mode: "download" | "print") => {
    if (!id || !receipt) return;
    setBusy(mode);
    try {
      const blob = await downloadPdf.mutateAsync(id);
      await openPdfBlob(blob, mode, `${receipt.receiptNo || id}.pdf`);
      showToast(mode === "print" ? "PDF opened for print" : "PDF downloaded", "success");
      void refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to prepare receipt PDF";
      showToast(message, "error");
    } finally {
      setBusy(null);
    }
  };

  const regeneratePdf = async () => {
    if (!id) return;
    setBusy("regenerate");
    try {
      await ensurePdf.mutateAsync({ id, force: true });
      showToast("Receipt PDF regenerated", "success");
      void refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to regenerate PDF";
      showToast(message, "error");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading receipt...
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="py-16 text-center text-red-600">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Failed to load receipt.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const pdfReady = !!receipt.pdfReady;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
            <Link to={`${basePath}/fees/receipts`}>
              <ArrowLeft className="h-4 w-4" /> Receipts
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-mono flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              {receipt.receiptNo}
            </h2>
            <p className="text-sm text-text-secondary">
              {receipt.studentName} · {receipt.admissionNo}
            </p>
          </div>
        </div>
        {receipt.status === "SUCCESS" && (
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={pdfReady ? "success" : "warning"} className="gap-1">
              <FileText className="h-3 w-3" />
              {pdfReady ? "PDF ready" : "PDF pending"}
            </Badge>
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => void regeneratePdf()}
            >
              {busy === "regenerate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {pdfReady ? "Regenerate PDF" : "Generate PDF"}
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
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Amount</p>
            <p className="text-lg font-bold">{formatMoney(receipt.amount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Method</p>
            <p className="text-lg font-bold">{receipt.method}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Date</p>
            <p className="text-lg font-bold">{formatOrgDate(receipt.date)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Status</p>
            <Badge variant="outline">{receipt.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Overview</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-secondary">Course:</span> {receipt.courseName}
            </div>
            <div>
              <span className="text-text-secondary">Fee head:</span> {receipt.feeHead || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Transaction ref:</span>{" "}
              {receipt.transactionRef || "—"}
            </div>
            <div>
              <span className="text-text-secondary">Student ID:</span>{" "}
              {receipt.studentId ? (
                <Link
                  to={`${basePath}/fees/students/${receipt.studentId}`}
                  className="text-primary hover:underline"
                >
                  View fee profile
                </Link>
              ) : (
                "—"
              )}
            </div>
            {receipt.notes && (
              <div className="sm:col-span-2">
                <span className="text-text-secondary">Notes:</span> {receipt.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Payment details / allocations</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pending fee</TableHead>
                <TableHead>Installment</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!receipt.allocations?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-text-secondary">
                    No allocation rows (payment may be unallocated).
                  </TableCell>
                </TableRow>
              ) : (
                receipt.allocations.map((a, idx) => (
                  <TableRow key={a.id || idx}>
                    <TableCell>
                      {a.pendingFee?.feeHead || a.pendingFeeId || "Charge"}
                    </TableCell>
                    <TableCell>{a.pendingFee?.installmentNo ?? "—"}</TableCell>
                    <TableCell className="font-bold">{formatMoney(a.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeeToastBanner toast={toast} onClose={clearToast} />
    </div>
  );
};
