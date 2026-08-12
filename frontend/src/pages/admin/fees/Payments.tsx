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
  Wallet
} from "lucide-react";
import { useFeeStore } from "../../../store/fee.store";
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
import type { PaymentMethod, PaymentStatus } from "../../../types/fee.types";

export const Payments: React.FC = () => {
  const { payments, addPayment, deletePayment } = useFeeStore();
  const { courses } = useCourseStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

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

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod = methodFilter === "ALL" || p.method === methodFilter;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalCollected = payments.reduce((acc, p) => (p.status === "SUCCESS" ? acc + p.amount : acc), 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCollected = payments
    .filter((p) => p.date === todayStr && p.status === "SUCCESS")
    .reduce((acc, p) => acc + p.amount, 0);

  const digitalPaymentsCount = payments.filter((p) => p.method === "UPI" || p.method === "NET_BANKING" || p.method === "CARD").length;
  const digitalPercent = payments.length > 0 ? Math.round((digitalPaymentsCount / payments.length) * 100) : 0;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !amount || !courseName) return;

    addPayment({
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
          className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white shadow-sm transition-colors"
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
              <p className="text-xs font-medium text-text-secondary">Total Collected Revenue</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{totalCollected.toLocaleString("en-IN")}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">₹{todayCollected.toLocaleString("en-IN")}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{payments.length}</h3>
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
              <h3 className="text-2xl font-bold text-text-primary">{digitalPercent}%</h3>
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
                  <TableHead className="font-semibold text-text-primary">Receipt No & Student</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Amount Paid</TableHead>
                  <TableHead className="font-semibold text-text-primary">Payment Method</TableHead>
                  <TableHead className="font-semibold text-text-primary">Date & Ref ID</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1769AA] block">
                            {p.receiptNo}
                          </span>
                          <span className="font-medium text-text-primary text-sm block">
                            {p.studentName}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {p.admissionNo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {p.courseName}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-emerald-700">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{getMethodBadge(p.method)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-800 block">{p.date}</span>
                          {p.transactionRef && (
                            <span className="font-mono text-[10px] text-slate-500 block truncate max-w-[120px]">
                              {p.transactionRef}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-text-secondary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-border shadow-md">
                            <DropdownMenuLabel>Receipt Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deletePayment(p.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No payment receipts found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Recording New Payment */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#1769AA]" />
              Record Fee Payment Receipt
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Aarav Gupta"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. ADM-2026-001"
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Collected (₹) *</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    className="bg-white border-slate-300 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                <select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="NET_BANKING">NetBanking</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / Cheque No</label>
                <Input
                  type="text"
                  placeholder="e.g. UPI/602188491029"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Remarks</label>
                <Input
                  type="text"
                  placeholder="e.g. First installment paid."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769AA] hover:bg-[#0B4F8A] text-white"
                >
                  Generate Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
