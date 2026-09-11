import React from "react";
import { Wallet, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { useStudentFeeStatement } from "@/hooks/useFees";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const MyFees: React.FC = () => {
  const { user } = useAuthStore();
  const academic = useStudentAcademicAccess();
  const studentId = academic.studentId || user?.studentId || undefined;
  const formatMoney = useFormatCurrency();
  const { data, isLoading, isError, refetch } = useStudentFeeStatement(studentId);

  const statement = data?.data;
  const summary = statement?.summary;
  const pendingFees = statement?.pendingFees || [];
  const payments = (statement?.payments || []).filter((p) => p.status !== "VOID");

  if (!studentId) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        Student profile is not linked to this account.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading your fees...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-600">
        <AlertCircle className="w-5 h-5 inline mr-2" /> Failed to load fees.
        <button className="underline ml-2" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Fees</h1>
        <p className="text-sm text-text-secondary">
          View tuition, book, exam and other dues, plus your payment receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Net payable</p>
            <p className="text-xl font-bold">
              {formatMoney(summary?.netPayable ?? summary?.totalFee ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Paid</p>
            <p className="text-xl font-bold text-emerald-700">
              {formatMoney(summary?.amountPaid ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Due</p>
            <p className="text-xl font-bold text-amber-700">
              {formatMoney(summary?.dueAmount ?? 0)}
            </p>
            <Badge className="mt-1" variant="outline">
              {summary?.status || "Pending"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Open charges
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee head</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-text-secondary">
                    No fee charges found.
                  </TableCell>
                </TableRow>
              ) : (
                pendingFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.feeHead || "Fee"}</TableCell>
                    <TableCell>{formatMoney(f.dueAmount)}</TableCell>
                    <TableCell>{formatMoney(f.amountPaid)}</TableCell>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Receipts
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-text-secondary">
                    No payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.receiptNo}</TableCell>
                    <TableCell>{formatMoney(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{new Date(p.date).toLocaleDateString("en-IN")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyFees;
