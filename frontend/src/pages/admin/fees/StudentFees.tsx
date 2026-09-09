import React, { useMemo, useState } from "react";
import {
  Wallet,
  Search,
  Loader2,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useStudentFeeStatement, useFeeStats } from "@/hooks/useFees";
import { useStudentList } from "@/hooks/useStudents";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
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
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const formatMoney = useFormatCurrency();

  const { data: statsData } = useFeeStats();
  const stats = statsData?.data;
  const { data: studentsData } = useStudentList({
    search: studentSearch || undefined,
    limit: 30,
  });
  const students = useMemo(() => {
    const raw = studentsData?.data;
    return Array.isArray(raw) ? raw : [];
  }, [studentsData]);

  const {
    data: statementRes,
    isLoading,
    isError,
    refetch,
  } = useStudentFeeStatement(selectedStudentId || undefined);

  const statement = statementRes?.data;
  const pendingFees = statement?.pendingFees || [];
  const payments = statement?.payments || [];
  const summary = statement?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Student Fees</h2>
        <p className="text-sm text-text-secondary">
          Search a student to view their fee statement, installments, and payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-lg font-bold">{formatMoney(stats?.totalCollected ?? 0)}</p>
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
              <p className="text-lg font-bold">{formatMoney(stats?.totalPendingDues ?? 0)}</p>
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
              <p className="text-lg font-bold">{stats?.totalTransactionsCount ?? 0}</p>
              <p className="text-xs text-text-secondary">Total Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search students by name or code..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="h-10 px-3 border rounded-md text-sm min-w-[260px]"
            >
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.name || "Student"} ({s.studentCode})
                </option>
              ))}
            </select>
          </div>

          {!selectedStudentId ? (
            <div className="text-center py-12 text-text-secondary">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Select a student to load their fee statement.
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading statement...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Failed to load statement.
              <Button variant="link" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-text-secondary">Student</p>
                  <p className="font-semibold">{statement?.student.name}</p>
                  <p className="text-xs font-mono text-text-secondary">
                    {statement?.student.studentCode}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-text-secondary">Total Fee</p>
                  <p className="font-semibold">{formatMoney(summary?.totalFee ?? 0)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-text-secondary">Paid / Due</p>
                  <p className="font-semibold">
                    {formatMoney(summary?.amountPaid ?? 0)} / {formatMoney(summary?.dueAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-text-secondary">Status</p>
                  <Badge
                    variant={
                      summary?.status === "Overdue"
                        ? "destructive"
                        : summary?.status === "Paid"
                          ? "success"
                          : "outline"
                    }
                  >
                    {summary?.status || "Pending"}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Installments
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Due Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-text-secondary">
                          No installment records.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingFees.map((f: PendingFee) => (
                        <TableRow key={f.id}>
                          <TableCell>{f.installmentNo}</TableCell>
                          <TableCell>{f.courseName}</TableCell>
                          <TableCell className="font-bold">
                            ₹{f.dueAmount?.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>₹{f.amountPaid?.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            {new Date(f.dueDate).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={f.status === "OVERDUE" ? "destructive" : "outline"}
                            >
                              {f.status === "DUE_SOON" ? "Due soon" : f.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Payments
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-text-secondary">
                          No payments recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p: Payment) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.receiptNo}</TableCell>
                          <TableCell className="font-bold">
                            ₹{p.amount?.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell>
                            {new Date(p.date).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
