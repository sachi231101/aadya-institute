import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Search, Loader2, AlertCircle } from "lucide-react";
import { useFeeInvoices } from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { aggregateInvoicesByStudentAndInstallment } from "@/utils/fee-display.util";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OtherInvoices } from "./OtherInvoices";
import type { StudentInvoice } from "@/types/fee.types";

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();

  const tab = searchParams.get("tab") === "other" ? "other" : "course";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const setTab = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "other") nextParams.set("tab", "other");
    else nextParams.delete("tab");
    setSearchParams(nextParams, { replace: true });
  };

  const { data, isLoading, isError, refetch } = useFeeInvoices({
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const rowsRaw = data?.data?.data || [];
  const rows = useMemo(
    () => aggregateInvoicesByStudentAndInstallment(rowsRaw as StudentInvoice[]),
    [rowsRaw]
  );
  const totalPages = data?.data?.totalPages ?? 1;

  return (
    <PageContainer maxWidth="full" className="min-w-0">
      <PageHeader
        title="Invoices"
        description="Course invoices and other bills (books, kits, misc.) in one place."
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
        <TabsList>
          <TabsTrigger value="course">Course invoices</TabsTrigger>
          <TabsTrigger value="other">Other invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="course" className="mt-4 w-full min-w-0">
      <Card className="w-full border-border/50">
        <CardContent className="sm:p-6 p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search invoice no, student, course..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 border rounded-md text-sm min-w-[180px] shrink-0"
            >
              <option value="ALL">All statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="w-full overflow-x-auto">
          <Table className="min-w-[900px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-600">
                    <AlertCircle className="w-5 h-5 inline mr-2" />
                    Failed to load.
                    <Button variant="link" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((inv) => (
                  <TableRow
                    key={`${inv.studentId || inv.studentName}-${inv.typeLabel}-${inv.installmentNo}`}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`${basePath}/fees/invoices/${inv.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell>
                      <div>{inv.studentName}</div>
                      <div className="text-xs text-text-secondary">{inv.admissionNo}</div>
                    </TableCell>
                    <TableCell>{inv.typeLabel}</TableCell>
                    <TableCell>{formatMoney(inv.totalAmount)}</TableCell>
                    <TableCell>{formatMoney(inv.amountPaid)}</TableCell>
                    <TableCell className="font-bold">{formatMoney(inv.balance)}</TableCell>
                    <TableCell>{formatOrgDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "OVERDUE" ? "destructive" : "outline"}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center text-sm">
              <span>
                Page {page} of {totalPages}
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
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="other" className="mt-4 w-full min-w-0">
          <OtherInvoices embedded />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};
