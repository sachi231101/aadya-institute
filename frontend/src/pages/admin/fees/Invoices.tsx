import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Search, Loader2, AlertCircle } from "lucide-react";
import { useFeeInvoices } from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  const rows = data?.data?.data || [];
  const totalPages = data?.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Invoices</h2>
        <p className="text-sm text-text-secondary">
          Course invoices and other bills (books, kits, misc.) in one place.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="course">Course invoices</TabsTrigger>
          <TabsTrigger value="other">Other invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="course" className="mt-4">
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
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
              className="h-10 px-3 border rounded-md text-sm min-w-[180px]"
            >
              <option value="ALL">All statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
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
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`${basePath}/fees/invoices/${inv.id}`)}
                  >
                    <TableCell className="font-mono font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell>
                      <div>{inv.studentName}</div>
                      <div className="text-xs text-text-secondary">{inv.admissionNo}</div>
                    </TableCell>
                    <TableCell>{inv.courseName}</TableCell>
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

        <TabsContent value="other" className="mt-4">
          <OtherInvoices embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
};
