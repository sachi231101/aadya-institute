import React, { useState } from "react";
import { 
  AlertCircle, 
  Search, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  DollarSign, 
  TrendingDown,
  UserX
} from "lucide-react";
import { useFeeStore } from "../../../store/fee.store";
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
import type { PaymentMethod, PendingFee } from "../../../types/fee.types";

export const PendingFees: React.FC = () => {
  const { pendingFees, recordPendingFeePayment } = useFeeStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  // Modal State for Fee Collection
  const [collectItem, setCollectItem] = useState<PendingFee | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("UPI");
  const [collectRef, setCollectRef] = useState("");

  const filteredPending = pendingFees.filter((pf) => {
    const matchesSearch =
      pf.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pf.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pf.phone.includes(searchTerm) ||
      pf.courseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || pf.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPendingDues = pendingFees.reduce((acc, pf) => acc + pf.dueAmount, 0);
  const overdueDues = pendingFees
    .filter((pf) => pf.status === "OVERDUE")
    .reduce((acc, pf) => acc + pf.dueAmount, 0);

  const overdueCount = pendingFees.filter((pf) => pf.status === "OVERDUE").length;
  const avgOverdueDays = overdueCount > 0 
    ? Math.round(pendingFees.reduce((acc, pf) => acc + pf.overdueDays, 0) / pendingFees.length) 
    : 0;

  const handleOpenCollectModal = (item: PendingFee) => {
    setCollectItem(item);
    setCollectAmount(item.dueAmount);
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectItem || collectAmount <= 0) return;

    recordPendingFeePayment(collectItem.id, collectAmount, collectMethod, collectRef);
    setCollectItem(null);
    setCollectRef("");
  };

  const handleSendReminder = (id: string) => {
    setReminderSentId(id);
    setTimeout(() => {
      setReminderSentId(null);
    }, 3000);
  };

  const getStatusBadge = (st: string, overdueDays: number) => {
    switch (st) {
      case "OVERDUE":
        return <Badge variant="destructive" className="font-semibold animate-pulse">{overdueDays} Days Overdue</Badge>;
      case "DUE_SOON":
        return <Badge variant="warning">Due Soon</Badge>;
      case "PARTIAL":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Partially Paid</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Pending Fees & Dues</h2>
          <p className="text-sm text-text-secondary">
            Monitor overdue student installments, collect pending dues, and send WhatsApp payment reminders.
          </p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Pending Dues</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{totalPendingDues.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Critically Overdue</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{overdueDues.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Overdue Students</p>
              <h3 className="text-2xl font-bold text-text-primary">{overdueCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Overdue Delay</p>
              <h3 className="text-2xl font-bold text-text-primary">{avgOverdueDays} Days</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {reminderSentId && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold">WhatsApp Fee Reminder & Payment Link Sent to Student!</p>
        </div>
      )}

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by student name, admission no, phone, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Dues Statuses</option>
                <option value="OVERDUE">Overdue</option>
                <option value="DUE_SOON">Due Soon</option>
                <option value="PARTIAL">Partially Paid</option>
              </select>
            </div>
          </div>

          {/* Pending Fees Data Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Student & Admission</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course & Installment</TableHead>
                  <TableHead className="font-semibold text-text-primary">Total Course Fee</TableHead>
                  <TableHead className="font-semibold text-text-primary">Amount Paid</TableHead>
                  <TableHead className="font-semibold text-text-primary">Remaining Due (₹)</TableHead>
                  <TableHead className="font-semibold text-text-primary">Due Date & Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.length > 0 ? (
                  filteredPending.map((pf) => (
                    <TableRow key={pf.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-text-primary text-sm block">
                            {pf.studentName}
                          </span>
                          <span className="text-xs text-text-secondary block">
                            {pf.admissionNo} • {pf.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            {pf.courseName}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Installment #{pf.installmentNo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        ₹{pf.totalFee.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-emerald-700">
                        ₹{pf.amountPaid.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-red-600">
                        ₹{pf.dueAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-800 block">{pf.dueDate}</span>
                          {getStatusBadge(pf.status, pf.overdueDays)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            onClick={() => handleOpenCollectModal(pf)}
                          >
                            <DollarSign className="mr-1 h-3.5 w-3.5" />
                            Collect Fee
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-xs text-[#1769AA] hover:bg-blue-50"
                            onClick={() => handleSendReminder(pf.id)}
                          >
                            <MessageSquare className="mr-1 h-3.5 w-3.5" />
                            WhatsApp Alert
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-text-muted">
                      No pending fee dues found. All student accounts are up to date!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog for Collecting Pending Fee */}
      {collectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Collect Pending Fee Due
            </h3>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{collectItem.studentName} ({collectItem.admissionNo})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course:</span>
                <span className="font-semibold text-slate-800">{collectItem.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Due Balance:</span>
                <span className="font-bold text-red-600">₹{collectItem.dueAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Being Collected (₹) *</label>
                <Input
                  type="number"
                  max={collectItem.dueAmount}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  required
                  className="bg-white border-slate-300 text-slate-900 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / Cheque No</label>
                <Input
                  type="text"
                  placeholder="e.g. UPI/60219988102"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCollectItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm & Clear Due
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
