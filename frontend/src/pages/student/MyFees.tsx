import React from "react";
import { Wallet, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useStudentAcademicAccess } from "@/hooks/useStudentAcademicAccess";
import { useStudentFeeStatement } from "@/hooks/useFees";
import { useFormatCurrency } from "@/hooks/useOrganizationFormat";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, MetricGrid, METRIC_GRID_COLUMNS, PageSection } from "@/components/layout";
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
      <PageContainer>
        <p className="text-sm text-text-secondary">Student profile is not linked to this account.</p>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[200px]">
        <p className="text-center text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading your fees...
        </p>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[200px]">
        <p className="text-center text-red-600">
          <AlertCircle className="w-5 h-5 inline mr-2" /> Failed to load fees.
          <button className="underline ml-2" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="My Fees"
        description="View tuition, book, exam and other dues, plus your payment receipts."
      />

      <MetricGrid density="compact" columns={METRIC_GRID_COLUMNS[3]}>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Net payable</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">
              {formatMoney(summary?.netPayable ?? summary?.totalFee ?? 0)}
            </h3>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paid</p>
            <h3 className="text-xl font-bold text-emerald-700 mt-0.5">
              {formatMoney(summary?.amountPaid ?? 0)}
            </h3>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Due</p>
            <h3 className="text-xl font-bold text-amber-700 mt-0.5">
              {formatMoney(summary?.dueAmount ?? 0)}
            </h3>
            <Badge className="mt-1" variant="outline">
              {summary?.status || "Pending"}
            </Badge>
          </CardContent>
        </Card>
      </MetricGrid>

      <PageSection title="Open charges">
      <Card>
        <CardContent className="p-5 space-y-3">
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
      </PageSection>

      <PageSection title="Receipts">
      <Card>
        <CardContent className="p-5 space-y-3">
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
      </PageSection>
    </PageContainer>
  );
};

export default MyFees;
