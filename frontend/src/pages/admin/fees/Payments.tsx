import React, { useState } from "react";
import { 
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
  FileText
} from "lucide-react";
import { usePayments, useFeeStats, useCreatePayment, useDeletePayment } from "../../../hooks/useFees";
import { useCourseStore } from "../../../store/course.store";
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

export const Payments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: paymentsData, isLoading: paymentsLoading } = usePayments({
    search: searchTerm,
    method: methodFilter,
    status: statusFilter,
  });

  const { data: statsData } = useFeeStats();
  const createPaymentMutation = useCreatePayment();
  const deletePaymentMutation = useDeletePayment();

  const { courses } = useCourseStore();

  // Receipt Modal State
  const [viewReceiptItem, setViewReceiptItem] = useState<Payment | null>(null);

  // Modal State for New Payment
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [courseName, setCourseName] = useState(courses[0]?.name || "Full Stack MERN Architecture");
  const [amount, setAmount] = useState<number>(25000);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const payments = paymentsData?.data?.data || [];
  const stats = statsData?.data || {
    totalCollected: 0,
    todayCollected: 0,
    digitalPercent: 0,
    totalTransactionsCount: 0,
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !amount || !courseName) return;

    try {
      await createPaymentMutation.mutateAsync({
        studentName,
        admissionNo: admissionNo || `ADM-2026-${Math.floor(100 + Math.random() * 900)}`,
        courseName,
        amount,
        date,
        method,
        transactionRef,
        status: "SUCCESS",
        notes,
      });

      setStudentName("");
      setAdmissionNo("");
      setTransactionRef("");
      setNotes("");
      setShowModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to record payment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this payment receipt record?")) return;
    try {
      await deletePaymentMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete payment");
    }
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case "UPI":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><Smartphone className="w-3 h-3 mr-1" /> UPI</Badge>;
      case "NET_BANKING":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Building className="w-3 h-3 mr-1" /> NetBanking</Badge>;
      case "CARD":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><CreditCard className="w-3 h-3 mr-1" /> Card</Badge>;
      case "CASH":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Wallet className="w-3 h-3 mr-1" /> Cash</Badge>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Fee Payment Receipts</h2>
          <p className="text-sm text-text-secondary">
            Issue and track student fee receipts, payment modes, and financial transaction logs.
          </p>
        </div>

        <Button 
          className="bg-[#1769AA] hover:bg-[#F39A16] text-white shadow-sm transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Record New Payment
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Revenue Collected</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{stats.totalCollected.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Collected Today</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{stats.todayCollected.toLocaleString("en-IN")}</h3>
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

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by receipt no, student name, admission no, or transaction ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="UPI">UPI</option>
                <option value="NET_BANKING">NetBanking</option>
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          {/* Payments Data Table */}
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
                        <Loader2 className="w-5 h-5 animate-spin text-[#1769AA]" />
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
                        <FileText className="h-4 w-4 text-[#1769AA]" />
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
                              <FileText className="mr-2 h-4 w-4 text-[#1769AA]" /> View & Print Receipt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Receipt Record
                            </DropdownMenuItem>
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

      {/* View Receipt Modal */}
      {viewReceiptItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Official Fee Receipt</h3>
                <p className="text-xs text-slate-500 font-mono">Aadya Institute of Technology</p>
              </div>
              <Badge className="bg-[#1769AA] text-white font-mono">{viewReceiptItem.receiptNo}</Badge>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Student Name</span>
                  <span className="font-semibold text-slate-900">{viewReceiptItem.studentName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Admission No</span>
                  <span className="font-semibold text-slate-900 font-mono">{viewReceiptItem.admissionNo}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block font-medium">Enrolled Course</span>
                <span className="font-semibold text-slate-900">{viewReceiptItem.courseName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Amount Received</span>
                  <span className="text-xl font-bold text-emerald-600">₹{viewReceiptItem.amount.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Payment Method</span>
                  <span className="font-semibold text-slate-900">{viewReceiptItem.method}</span>
                </div>
              </div>

              {viewReceiptItem.transactionRef && (
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Transaction Reference</span>
                  <span className="font-mono text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded inline-block">
                    {viewReceiptItem.transactionRef}
                  </span>
                </div>
              )}

              {viewReceiptItem.notes && (
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Notes / Remarks</span>
                  <span className="text-slate-700 text-xs italic">{viewReceiptItem.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => window.print()}>
                Print Receipt
              </Button>
              <Button className="bg-[#1769AA]" onClick={() => setViewReceiptItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Record Student Fee Payment</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>✕</Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Student Name *</label>
                <Input
                  required
                  placeholder="e.g. Aarav Gupta"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Admission No</label>
                  <Input
                    placeholder="ADM-2026-XXX"
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Amount Paid (₹) *</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Course Enrolled *</label>
                <select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-[#1769AA]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Full Stack MERN Architecture">Full Stack MERN Architecture</option>
                  <option value="Backend Engineering & Systems">Backend Engineering & Systems</option>
                  <option value="Data Science & Applied Machine Learning">Data Science & Applied Machine Learning</option>
                  <option value="Product UI/UX Design Masterclass">Product UI/UX Design Masterclass</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Ref / Cheque No</label>
                <Input
                  placeholder="e.g. UPI/602188491029 or HDFC/N291048102"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks / Notes</label>
                <Input
                  placeholder="e.g. First Installment Token Fee"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? "Generating Receipt..." : "Record & Issue Receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
