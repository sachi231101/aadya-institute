import React, { useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  AlertCircle,
  Plus,
  Wallet,
  FileText,
  Receipt,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import {
  useStudentFeeStatement,
  useCreateFeeCharge,
  useSendFeeReminder,
} from "@/hooks/useFees";
import { useFormatCurrency, useOrganizationDate } from "@/hooks/useOrganizationFormat";
import { getPortalBasePath } from "@/utils/portal-path";
import {
  aggregateChargesByFeeHeadAndInstallment,
  aggregateInvoicesByStudentAndInstallment,
  normalizeFeeHeadLabel,
  paymentTypeLabel,
} from "@/utils/fee-display.util";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MasterSelect } from "@/components/common/MasterSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PendingFee, Payment, StudentInvoice } from "@/types/fee.types";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PageContainer, PageHeader } from "@/components/layout";
import { CourseChips } from "@/components/common/CourseChips";
import { coursesFromStudent } from "@/utils/admission-package.utils";
import { CollectFeeModal } from "./CollectFeeModal";
import { FeeToastBanner, useFeeToast } from "./FeeToast";

export const StudentFeeProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getPortalBasePath(location.pathname);
  const formatMoney = useFormatCurrency();
  const { format: formatOrgDate } = useOrganizationDate();
  const createCharge = useCreateFeeCharge();
  const sendReminder = useSendFeeReminder();
  const profileTab = searchParams.get("tab") || "overview";

  const [showCharge, setShowCharge] = useState(false);
  const [chargeHeadId, setChargeHeadId] = useState("");
  const [chargeAmount, setChargeAmount] = useState(0);
  const [chargeDueDate, setChargeDueDate] = useState("");
  const [chargeCourseKey, setChargeCourseKey] = useState("");
  const [collectItem, setCollectItem] = useState<PendingFee | null>(null);
  const [collectStudent, setCollectStudent] = useState<{
    id: string;
    name: string;
    admissionNo?: string | null;
    outstanding: number;
  } | null>(null);
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useFeeToast();

  const { data, isLoading, isError, refetch } = useStudentFeeStatement(studentId);
  const statement = data?.data;
  const summary = statement?.summary;
  const pendingFees = useMemo(
    () => aggregateChargesByFeeHeadAndInstallment(statement?.pendingFees || []),
    [statement?.pendingFees]
  );
  const payments = useMemo(
    () => (statement?.payments || []) as Payment[],
    [statement?.payments]
  );
  const invoices = useMemo(
    () =>
      aggregateInvoicesByStudentAndInstallment((statement?.invoices || []) as StudentInvoice[]),
    [statement?.invoices]
  );
  const receipts = useMemo(() => {
    const raw = (statement?.receipts ||
      (statement?.payments || []).filter((p) => p.status === "SUCCESS")) as Payment[];
    return raw;
  }, [statement?.receipts, statement?.payments]);
  const openPending = useMemo(
    () => pendingFees.filter((f) => Number(f.dueAmount || 0) > 0),
    [pendingFees]
  );
  const outstanding = summary?.dueAmount ?? openPending.reduce((s, f) => s + (f.dueAmount || 0), 0);
  const enrolledCourses = coursesFromStudent({
    courses: statement?.student.courses,
    courseName: statement?.student.courseName,
  });

  const submitCharge = async () => {
    if (!studentId || !chargeHeadId || chargeAmount <= 0) return;
    const selectedCourse =
      enrolledCourses.find(
        (c) => c.id === chargeCourseKey || c.admissionId === chargeCourseKey
      ) || (enrolledCourses.length === 1 ? enrolledCourses[0] : undefined);
    try {
      await createCharge.mutateAsync({
        studentId,
        feeHeadMasterId: chargeHeadId,
        amount: chargeAmount,
        dueDate: chargeDueDate || undefined,
        courseName: selectedCourse?.name,
        admissionId: selectedCourse?.admissionId,
      });
      setShowCharge(false);
      setChargeAmount(0);
      setChargeHeadId("");
      setChargeDueDate("");
      setChargeCourseKey("");
      showToast("Charge created", "success");
      void refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create charge";
      showToast(message, "error");
    }
  };

  const handleCollectPending = (f: PendingFee & { sourceIds?: string[] }) => {
    const sources = f.sourceIds?.length ? f.sourceIds : [f.id];
    if (sources.length > 1 && studentId && statement?.student) {
      setCollectItem(null);
      setCollectStudent({
        id: studentId,
        name: statement.student.name,
        admissionNo: statement.student.admissionNo || statement.student.studentCode,
        outstanding: Number(f.dueAmount),
      });
      return;
    }
    setCollectStudent(null);
    setCollectItem({ ...f, dueAmount: Number(f.dueAmount) });
  };

  const handleSendReminder = async (item: PendingFee) => {
    try {
      setReminderSentId(item.id);
      const res = await sendReminder.mutateAsync(item.id);
      const payload = res?.data;
      if (payload?.status === "SKIPPED") {
        showToast(
          payload.message || `Reminder skipped (${payload.skipReason || "unknown"})`,
          "info"
        );
      } else {
        showToast(payload?.message || "WhatsApp reminder queued", "success");
      }
      setTimeout(() => setReminderSentId(null), 3000);
    } catch (err: unknown) {
      setReminderSentId(null);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send reminder";
      showToast(message, "error");
    }
  };

  const setProfileTab = (next: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "overview") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading student fee profile...
      </div>
    );
  }

  if (isError || !statement) {
    return (
      <div className="py-16 text-center text-red-600">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        Failed to load student fee profile.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link to={`${basePath}/fees/students`}>
          <ArrowLeft className="h-4 w-4" /> Student Fees
        </Link>
      </Button>
      <PageHeader
        title={statement.student.name}
        description={
          <span className="flex flex-col gap-1.5">
            <span className="font-mono">
              {statement.student.studentCode}
              {statement.student.phone ? ` · ${statement.student.phone}` : ""}
            </span>
            {enrolledCourses.length > 0 && (
              <CourseChips courses={enrolledCourses} fallback="" maxVisible={6} plainWhenSingle={false} />
            )}
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (enrolledCourses.length === 1) {
                  setChargeCourseKey(
                    enrolledCourses[0].admissionId || enrolledCourses[0].id
                  );
                } else {
                  setChargeCourseKey("");
                }
                setShowCharge(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Charge
            </Button>
            {outstanding > 0 && (
              <PermissionGate itemKey="fees.students" mode="write">
                <Button
                  className="gap-2"
                  onClick={() =>
                    setCollectStudent({
                      id: statement.student.id,
                      name: statement.student.name,
                      admissionNo:
                        statement.student.admissionNo || statement.student.studentCode,
                      outstanding,
                    })
                  }
                >
                  <CreditCard className="h-4 w-4" /> Collect outstanding
                </Button>
              </PermissionGate>
            )}
            <Button variant="outline" asChild className="gap-2">
              <Link to={`${basePath}/fees/payments?studentId=${statement.student.id}`}>
                <Wallet className="h-4 w-4" /> Record Payment
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Total Fee</p>
            <p className="text-lg font-bold">{formatMoney(summary?.totalFee ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Paid</p>
            <p className="text-lg font-bold">{formatMoney(summary?.amountPaid ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-text-secondary">Outstanding</p>
            <p className="text-lg font-bold">{formatMoney(summary?.dueAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      </div>

      <Tabs value={profileTab} onValueChange={setProfileTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Fee Details</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Summary by fee head
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Head</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(statement.byFeeHead || summary?.byFeeHead || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-text-secondary">
                        No fee heads yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (statement.byFeeHead || summary?.byFeeHead || []).map((h) => (
                      <TableRow key={h.feeHeadMasterId || h.feeHead}>
                        <TableCell>{normalizeFeeHeadLabel(h.feeHead)}</TableCell>
                        <TableCell>{formatMoney(h.totalFee)}</TableCell>
                        <TableCell>{formatMoney(h.amountPaid)}</TableCell>
                        <TableCell className="font-bold">{formatMoney(h.dueAmount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {summary?.nextDueDate && (
                <p className="text-sm text-text-secondary flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Next due: {formatOrgDate(summary.nextDueDate)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Recent payment activity
              </h3>
              {payments.length === 0 ? (
                <p className="text-sm text-text-secondary py-4 text-center">No payments yet.</p>
              ) : (
                <div className="space-y-3">
                  {payments.slice(0, 8).map((p: Payment) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-border/60 p-3 space-y-2 bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold">{p.receiptNo}</p>
                          <p className="text-xs text-text-secondary">
                            {formatOrgDate(p.date)} · {p.method}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatMoney(p.amount)}</p>
                          <Badge
                            variant={p.status === "VOID" ? "destructive" : "outline"}
                            className="text-[10px]"
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                      {(p.allocations || []).length > 0 ? (
                        <ul className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                          {p.allocations!.map((a) => (
                            <li key={a.id || `${a.pendingFeeId}-${a.amount}`} className="flex justify-between gap-2">
                              <span>
                                {a.pendingFee?.feeHead || "Charge"} · Inst #
                                {a.pendingFee?.installmentNo ?? "—"}
                              </span>
                              <span className="font-medium">{formatMoney(a.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : p.status === "SUCCESS" ? (
                        <p className="text-xs text-amber-700">No allocation lines linked</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fee Head</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingFees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-text-secondary">
                        No charge records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingFees.map((f) => (
                      <TableRow key={`${f.typeLabel}-${f.installmentNo}`}>
                        <TableCell>{f.installmentNo}</TableCell>
                        <TableCell>{f.typeLabel}</TableCell>
                        <TableCell>
                          {formatMoney(Number(f.amountPaid) + Number(f.dueAmount))}
                        </TableCell>
                        <TableCell>{formatMoney(f.amountPaid)}</TableCell>
                        <TableCell className="font-bold">{formatMoney(f.dueAmount)}</TableCell>
                        <TableCell>{formatOrgDate(f.dueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={f.status === "OVERDUE" ? "destructive" : "outline"}>
                            {f.status === "DUE_SOON" ? "Due soon" : f.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Fee Head</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-text-secondary">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No invoices.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow key={`${inv.typeLabel}-${inv.installmentNo}-${inv.id}`}>
                        <TableCell>
                          <Link
                            to={`${basePath}/fees/invoices/${inv.id}`}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {inv.invoiceNo}
                          </Link>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Applied to</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-text-secondary">
                        No payments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">
                          {p.receiptNo}
                        </TableCell>
                        <TableCell className="font-bold">{formatMoney(p.amount)}</TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[220px]">
                          {paymentTypeLabel(
                            p.feeHead,
                            p.notes,
                            p.allocations?.find((a) => a.pendingFee?.installmentNo)?.pendingFee
                              ?.installmentNo
                          )}
                        </TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell>{formatOrgDate(p.date)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "VOID" ? "destructive" : "outline"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Fee Head</TableHead>
                    <TableHead>Inst.</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Overdue Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-text-secondary">
                        No pending dues.
                      </TableCell>
                    </TableRow>
                  ) : (
                    openPending.map((f) => (
                      <TableRow key={`${f.typeLabel}-${f.installmentNo}`}>
                        <TableCell className="font-mono text-xs">{f.invoiceNo || "—"}</TableCell>
                        <TableCell>{f.typeLabel}</TableCell>
                        <TableCell>#{f.installmentNo || 1}</TableCell>
                        <TableCell className="font-bold">{formatMoney(f.dueAmount)}</TableCell>
                        <TableCell>{formatOrgDate(f.dueDate)}</TableCell>
                        <TableCell>{f.overdueDays}</TableCell>
                        <TableCell>
                          <Badge variant={f.status === "OVERDUE" ? "destructive" : "outline"}>
                            {f.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <PermissionGate itemKey="fees.students" mode="write">
                              <Button size="sm" onClick={() => handleCollectPending(f)}>
                                Collect
                              </Button>
                            </PermissionGate>
                            <PermissionGate itemKey="fees.students" mode="write">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleSendReminder(f)}
                                disabled={reminderSentId === f.id || sendReminder.isPending}
                              >
                                {reminderSentId === f.id ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sent
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5 mr-1" /> Remind
                                  </>
                                )}
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-text-secondary">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No receipts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">
                          {r.receiptNo}
                        </TableCell>
                        <TableCell>
                          {paymentTypeLabel(
                            r.feeHead,
                            r.notes,
                            r.allocations?.find((a) => a.pendingFee?.installmentNo)?.pendingFee
                              ?.installmentNo
                          )}
                        </TableCell>
                        <TableCell className="font-bold">{formatMoney(r.amount)}</TableCell>
                        <TableCell>{formatOrgDate(r.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`${basePath}/fees/receipts/${r.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCharge && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Add fee charge</h3>
              <p className="text-sm text-text-secondary">
                Create book, exam, or other dues for this student.
              </p>
              <div className="space-y-2">
                <Label>Fee head</Label>
                <MasterSelect
                  entityType="feeheads"
                  value={chargeHeadId}
                  onChange={setChargeHeadId}
                  placeholder="Select fee head"
                />
              </div>
              {enrolledCourses.length > 0 && (
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select
                    value={chargeCourseKey}
                    onChange={(e) => setChargeCourseKey(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">
                      {enrolledCourses.length === 1
                        ? enrolledCourses[0].name
                        : "Select course"}
                    </option>
                    {enrolledCourses.map((c) => (
                      <option key={c.admissionId || c.id} value={c.admissionId || c.id}>
                        {c.name}
                        {c.code ? ` (${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={1}
                  value={chargeAmount || ""}
                  onChange={(e) => setChargeAmount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={chargeDueDate}
                  onChange={(e) => setChargeDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCharge(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    !chargeHeadId ||
                    chargeAmount <= 0 ||
                    createCharge.isPending ||
                    (enrolledCourses.length > 1 && !chargeCourseKey)
                  }
                  onClick={() => void submitCharge()}
                >
                  {createCharge.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create charge"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {collectItem && (
        <CollectFeeModal
          item={collectItem}
          onClose={() => setCollectItem(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            void refetch();
          }}
        />
      )}

      {collectStudent && (
        <CollectFeeModal
          mode="student"
          student={collectStudent}
          onClose={() => setCollectStudent(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            void refetch();
          }}
        />
      )}

      <FeeToastBanner toast={toast} onClose={clearToast} />
    </PageContainer>
  );
};
