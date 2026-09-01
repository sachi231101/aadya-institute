import React, { useState } from "react";
import {
  Wallet,
  Search,
  Loader2,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { usePendingFees, usePayments, useFeeStats } from "@/hooks/useFees";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PendingFee, Payment } from "@/types/fee.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const StudentFees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"pending" | "payments">("pending");

  const { data: statsData } = useFeeStats();
  const stats = statsData?.data;

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = usePendingFees({
    search: searchTerm || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePayments({
    search: searchTerm || undefined,
    page,
    limit: 20,
  });

  const fees = pendingData?.data?.data || [];
  const pendingMeta = pendingData?.data || { totalPages: 1, page: 1 };
  const payments = paymentsData?.data?.data || [];
  const paymentsMeta = paymentsData?.data || { totalPages: 1, page: 1 };

  const meta = activeTab === "pending" ? pendingMeta : paymentsMeta;
  const isLoading = activeTab === "pending" ? pendingLoading : paymentsLoading;
  const isError = activeTab === "pending" ? pendingError : paymentsError;
  const refetch = activeTab === "pending" ? refetchPending : refetchPayments;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Student Fees</h2>
        <p className="text-sm text-text-secondary">
          View pending dues and payment collection summary.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#1769AA]" />
            </div>
            <div>
              <p className="text-lg font-bold">
                ₹{(stats?.totalCollected ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-text-secondary">Total Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold">
                ₹{(stats?.totalPendingDues ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-text-secondary">Pending Dues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats?.totalTransactionsCount ?? payments.length}</p>
              <p className="text-xs text-text-secondary">Total Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "pending" ? "default" : "outline"}
                size="sm"
                className={activeTab === "pending" ? "bg-[#1769AA] text-white" : ""}
                onClick={() => {
                  setActiveTab("pending");
                  setPage(1);
                }}
              >
                <Wallet className="h-4 w-4 mr-1" /> Pending Fees
              </Button>
              <Button
                variant={activeTab === "payments" ? "default" : "outline"}
                size="sm"
                className={activeTab === "payments" ? "bg-[#1769AA] text-white" : ""}
                onClick={() => {
                  setActiveTab("payments");
                  setPage(1);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" /> Payments
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  placeholder="Search by student name or admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {activeTab === "pending" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 border rounded-md text-sm"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              )}
            </div>
          </div>

          {activeTab === "pending" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Due Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load.
                      <Button variant="link" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : fees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No pending fee records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  fees.map((f: PendingFee) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.studentName}</TableCell>
                      <TableCell className="font-mono text-sm">{f.admissionNo}</TableCell>
                      <TableCell>{f.courseName}</TableCell>
                      <TableCell className="font-bold">
                        ₹{f.dueAmount?.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{new Date(f.dueDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={f.status === "OVERDUE" ? "destructive" : "outline"}>
                          {f.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-red-600">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      Failed to load payments.
                      <Button variant="link" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-secondary">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No payment records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p: Payment) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.receiptNo}</TableCell>
                      <TableCell className="font-medium">{p.studentName}</TableCell>
                      <TableCell>{p.courseName}</TableCell>
                      <TableCell className="font-bold">₹{p.amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{new Date(p.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "SUCCESS"
                              ? "outline"
                              : p.status === "FAILED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {meta.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <span>
                Page {meta.page} of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
