import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Receipt, Search, Loader2, AlertCircle, Download, Eye, FileText } from "lucide-react";
import { useFeeReceipts, useDownloadReceiptPdf } from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { aggregateByStudentAndFeeType } from "@/utils/fee-display.util";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { PageContainer, PageHeader } from "@/components/layout";
import type { Payment } from "@/types/fee.types";

async function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const Receipts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();
  const downloadPdf = useDownloadReceiptPdf();
  const { toast, showToast, clearToast } = useFeeToast();

  const { data, isLoading, isError, refetch } = useFeeReceipts({
    search: searchTerm || undefined,
    page,
    limit: 50,
  });
  const rawReceipts = (data?.data?.data || data?.data || []) as Payment[];
  const receipts = useMemo(
    () => (Array.isArray(rawReceipts) ? aggregateByStudentAndFeeType(rawReceipts) : []),
    [rawReceipts]
  );
  const meta = data?.data || { totalPages: 1, page: 1 };

  const handleDownload = async (id: string, receiptNo: string) => {
    setDownloadingId(id);
    try {
      const blob = await downloadPdf.mutateAsync(id);
      await triggerPdfDownload(blob, `${receiptNo || id}.pdf`);
      showToast("PDF downloaded", "success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to download PDF — open the receipt and tap Generate PDF";
      showToast(message, "error");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <PageContainer maxWidth="full" className="min-w-0">
      <PageHeader
        title="Receipts"
        description="All fee collections — view, print, or download receipts."
      />

      <Card className="w-full border-border/50">
        <CardContent className="sm:p-6 p-4 space-y-4">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="w-full overflow-x-auto">
          <Table className="min-w-[900px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-text-secondary">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No receipts found.
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((r) => (
                    <TableRow
                      key={`${r.studentId || r.studentName}-${r.typeLabel}`}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`${basePath}/fees/receipts/${r.id}`)}
                    >
                      <TableCell className="font-mono font-medium">
                        <div>{r.receiptNo}</div>
                        {r.sourceIds.length > 1 ? (
                          <div className="text-[11px] text-text-muted mt-0.5">
                            +{r.sourceIds.length - 1} more
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {r.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{formatMoney(r.amount ?? 0)}</TableCell>
                      <TableCell>{r.method}</TableCell>
                      <TableCell>{formatOrgDate(r.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "SUCCESS" ? (
                          <Badge
                            variant={r.receiptPdfUrl ? "success" : "warning"}
                            className="gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            {r.receiptPdfUrl ? "Ready" : "Pending"}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`${basePath}/fees/receipts/${r.id}`}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Link>
                          </Button>
                          {r.status === "SUCCESS" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={downloadingId === r.id}
                              onClick={() => void handleDownload(r.id, r.receiptNo)}
                            >
                              {downloadingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" /> PDF
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <span>
                Page {meta.page || page} of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (meta.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FeeToastBanner toast={toast} onClose={clearToast} />
    </PageContainer>
  );
};
