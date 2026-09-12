import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Search,
  Receipt,
  CheckCircle2,
  MoreVertical,
  Trash2,
  DollarSign,
  TrendingUp,
  Building,
  Smartphone,
  Wallet,
  Loader2,
  FileText,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  usePayments,
  useFeeStats,
  useCreatePayment,
  useVoidPayment,
  usePendingFees,
} from "../../../hooks/useFees";
import { useCourses } from "../../../hooks/useCourses";
import { useStudentList } from "../../../hooks/useStudents";
import { usePermissions } from "@/hooks/usePermissions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentMethod, PaymentStatus, Payment } from "../../../types/fee.types";
import { MasterSelect } from "@/components/common/MasterSelect";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { getPortalBasePath } from "@/utils/portal-path";
import { FeeToastBanner, useFeeToast } from "./FeeToast";

export const Payments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const basePath = getPortalBasePath(location.pathname);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { hasPermission } = usePermissions();
  const canDeletePayment = hasPermission("fee.delete");
  const { toast, showToast, clearToast } = useFeeToast();

  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({
    search: searchTerm || undefined,
    paymentModeMasterId: methodFilter !== "ALL" ? methodFilter : undefined,
    status: statusFilter,
  });

  const { data: statsData } = useFeeStats();
  const createPaymentMutation = useCreatePayment();
  const voidPaymentMutation = useVoidPayment();
  const { courses } = useCourses();
  const { data: studentsData } = useStudentList({ limit: 200 });
  const students = useMemo(() => {
    const raw = studentsData?.data;
    return Array.isArray(raw) ? raw : [];
  }, [studentsData]);

  const [viewReceiptItem, setViewReceiptItem] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [pendingFeeId, setPendingFeeId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentModeMasterId, setPaymentModeMasterId] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [feeHeadMasterId, setFeeHeadMasterId] = useState("");
  const [lateFee, setLateFee] = useState<number>(0);
  const [bankAccountMasterId, setBankAccountMasterId] = useState("");
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(true);

  useEffect(() => {
    const fromQuery = searchParams.get("studentId");
    if (fromQuery) {
      setStudentId(fromQuery);
      setShowModal(true);
    }
  }, [searchParams]);

  const selectedStudent = students.find((s) => s.id === studentId);
  const { data: openPendingData } = usePendingFees({
    studentId: studentId || undefined,
    status: "UNPAID",
    limit: 50,
  });
  const openInstallments = openPendingData?.data?.data || [];

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 50);
    return students
      .filter((s) => {
        const name = s.user?.name?.toLowerCase() || "";
        const code = s.studentCode?.toLowerCase() || "";
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 50);
  }, [students, studentSearch]);

  const payments = paymentsData?.data?.data || [];
  const stats = statsData?.data || {
    totalCollected: 0,
    todayCollected: 0,
    digitalPercent: 0,
    totalTransactionsCount: 0,
  };

  const resetModal = () => {
    setStudentId("");
    setStudentSearch("");
    setPendingFeeId("");
    setAmount(0);
    setLateFee(0);
    setPaymentModeMasterId("");
    setTransactionRef("");
    setNotes("");
    setFeeHeadMasterId("");
    setBankAccountMasterId("");
    setSendWhatsAppReceipt(true);
    setShowModal(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount || !paymentModeMasterId) return;

    const totalAmount = amount + (lateFee || 0);
    try {
      await createPaymentMutation.mutateAsync({
        studentId,
        amount: totalAmount,
        lateFee: 0,
        date,
        paymentModeMasterId,
        bankAccountMasterId: bankAccountMasterId || undefined,
        feeHeadMasterId: feeHeadMasterId || undefined,
        transactionRef: transactionRef || undefined,
        status: "SUCCESS",
        notes: notes || undefined,
        pendingFeeId: pendingFeeId || undefined,
        sendWhatsAppReceipt,
      });
      resetModal();
      showToast("Payment recorded", "success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to record payment";
      showToast(message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Void this payment and reverse linked charge dues? The receipt number is kept."))
      return;
    try {
      await voidPaymentMutation.mutateAsync(id);
      showToast("Payment voided and dues restored", "success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to void payment";
      showToast(message, "error");
    }
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case "UPI":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Smartphone className="w-3 h-3 mr-1" /> UPI
          </Badge>
        );
      case "NET_BANKING":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Building className="w-3 h-3 mr-1" /> NetBanking
          </Badge>
        );
      case "CARD":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <CreditCard className="w-3 h-3 mr-1" /> Card
          </Badge>
        );
      case "CASH":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Wallet className="w-3 h-3 mr-1" /> Cash
          </Badge>
        );
      default:
        return <Badge variant="outline">{m}</Badge>;
    }
  };

  const getStatusBadge = (st: PaymentStatus) => {
    switch (st) {
      case "SUCCESS":
        return <Badge variant="success">Completed</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending Clearance</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 gap-2">
            <Link to={`${basePath}/fees/students`}>
              <ArrowLeft className="h-4 w-4" /> Student Fees
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Record Payment</h2>
          <p className="text-sm text-text-secondary">
            Collect a payment against a student due. Issued receipts appear under Receipts.
          </p>
        </div>

        <PermissionGate itemKey="fees.payments" mode="write">
          <Button
            className="bg-[#2563EB] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
            onClick={() => setShowModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Record New Payment
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Revenue Collected</p>
              <h3 className="text-2xl font-bold text-text-primary">
                ₹{stats.totalCollected.toLocaleString("en-IN")}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#2563EB]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Collected Today</p>
              <h3 className="text-2xl font-bold text-text-primary">
                ₹{stats.todayCollected.toLocaleString("en-IN")}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Receipts Issued</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats.totalTransactionsCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Digital Payment Split</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats.digitalPercent}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by receipt no, student name, admission no, or transaction ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <MasterSelect
                entityType="paymentmodes"
                value={methodFilter === "ALL" ? "" : methodFilter}
                onChange={(id) => setMethodFilter(id || "ALL")}
                placeholder="All Payment Methods"
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm mt-0"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Receipt No</TableHead>
                  <TableHead className="font-semibold text-text-primary">Student Details</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Amount Paid</TableHead>
                  <TableHead className="font-semibold text-text-primary">Payment Mode</TableHead>
                  <TableHead className="font-semibold text-text-primary">Date</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                        Loading payment receipts...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                      No payment receipt records found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <TableCell className="font-medium text-slate-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#2563EB]" />
                        {p.receiptNo}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-text-primary">{p.studentName}</div>
                        <div className="text-xs text-text-secondary font-mono">{p.admissionNo}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-700 font-medium">
                        {p.courseName}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{getMethodBadge(p.method)}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {new Date(p.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewReceiptItem(p)}>
                              <FileText className="mr-2 h-4 w-4 text-[#2563EB]" /> View & Print Receipt
                            </DropdownMenuItem>
                            {canDeletePayment && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(p.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Void Receipt
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewReceiptItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Official Fee Receipt</h3>
                <p className="text-xs text-slate-500 font-mono">Aadya Institute of Technology</p>
              </div>
              <Badge className="bg-[#2563EB] text-white font-mono">{viewReceiptItem.receiptNo}</Badge>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Student Name</span>
                  <span className="font-semibold text-slate-900">{viewReceiptItem.studentName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Admission No</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {viewReceiptItem.admissionNo}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium">Enrolled Course</span>
                <span className="font-semibold text-slate-900">{viewReceiptItem.courseName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Amount Received</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ₹{viewReceiptItem.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Payment Method</span>
                  <span className="font-semibold text-slate-900">{viewReceiptItem.method}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => window.print()}>
                Print Receipt
              </Button>
              <Button className="bg-[#2563EB]" onClick={() => setViewReceiptItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Record Student Fee Payment</h3>
              <Button variant="ghost" size="icon" onClick={resetModal}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Student *</label>
                <Input
                  placeholder="Search student by name or code..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="mb-2"
                />
                <select
                  required
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setPendingFeeId("");
                  }}
                  className="w-full h-10 px-3 border rounded-md text-sm border-slate-300"
                >
                  <option value="">Select student</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.name || "Student"} ({s.studentCode})
                      {s.courseName ? ` — ${s.courseName}` : ""}
                    </option>
                  ))}
                </select>
                {selectedStudent && (
                  <p className="text-xs text-slate-500 mt-1">
                    Branch: {selectedStudent.branch?.name || "—"} · Course:{" "}
                    {selectedStudent.courseName ||
                      selectedStudent.courses?.[0]?.name ||
                      "—"}
                  </p>
                )}
              </div>

              {studentId && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Apply to installment (optional)
                  </label>
                  <select
                    value={pendingFeeId}
                    onChange={(e) => {
                      setPendingFeeId(e.target.value);
                      const item = openInstallments.find((i) => i.id === e.target.value);
                      if (item) setAmount(item.dueAmount);
                    }}
                    className="w-full h-10 px-3 border rounded-md text-sm border-slate-300"
                  >
                    <option value="">FIFO across open installments</option>
                    {openInstallments.map((i) => (
                      <option key={i.id} value={i.id}>
                        #{i.installmentNo} · ₹{i.dueAmount.toLocaleString("en-IN")} due ·{" "}
                        {new Date(i.dueDate).toLocaleDateString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount Paid (₹) *
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Late Fee / Fine (₹)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={lateFee}
                    onChange={(e) => setLateFee(Number(e.target.value))}
                  />
                </div>
              </div>

              {(lateFee > 0 || amount > 0) && (
                <p className="text-xs text-slate-600">
                  Total charged: ₹{(amount + (lateFee || 0)).toLocaleString("en-IN")}
                  {courses.length > 0 ? "" : ""}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fee Head</label>
                  <MasterSelect
                    entityType="feeheads"
                    value={feeHeadMasterId}
                    onChange={setFeeHeadMasterId}
                    placeholder="Select Fee Head"
                    className="mt-0 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Payment Method *
                  </label>
                  <MasterSelect
                    entityType="paymentmodes"
                    value={paymentModeMasterId}
                    onChange={setPaymentModeMasterId}
                    placeholder="Select Payment Mode"
                    className="mt-0 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Payment Date
                  </label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Bank / Deposit Account
                  </label>
                  <MasterSelect
                    entityType="bankaccounts"
                    value={bankAccountMasterId}
                    onChange={setBankAccountMasterId}
                    placeholder="Select Bank Account"
                    className="mt-0 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Transaction Ref / Cheque No
                </label>
                <Input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={sendWhatsAppReceipt}
                  onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label className="text-xs font-medium text-slate-600">
                  Send WhatsApp receipt confirmation
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={resetModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#F39A16] text-white"
                  disabled={createPaymentMutation.isPending || !studentId}
                >
                  {createPaymentMutation.isPending ? "Recording..." : "Submit Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <FeeToastBanner toast={toast} onClose={clearToast} />
    </div>
  );
};
