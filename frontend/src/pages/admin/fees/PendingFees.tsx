import React, { useState } from "react";
import { 
  AlertCircle, 
  Search, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  TrendingDown,
  UserX,
  Loader2,
  Send
} from "lucide-react";
import { usePendingFees, useFeeStats, useCollectPendingFee, useSendFeeReminder } from "../../../hooks/useFees";
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
import { useMasterDropdown } from "@/hooks/useMasterDropdown";

export const PendingFees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  const { data: pendingData, isLoading: pendingLoading } = usePendingFees({
    search: searchTerm,
    status: statusFilter,
  });

  const { data: statsData } = useFeeStats();
  const collectFeeMutation = useCollectPendingFee();
  const sendReminderMutation = useSendFeeReminder();
  const { options: paymentModeOptions } = useMasterDropdown("paymentmodes");

  // Modal State for Fee Collection
  const [collectItem, setCollectItem] = useState<PendingFee | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("UPI");
  const [collectRef, setCollectRef] = useState("");
  const [collectNotes, setCollectNotes] = useState("");

  const pendingFees = pendingData?.data?.data || [];
  const stats = statsData?.data || {
    totalPendingDues: 0,
    overdueDues: 0,
    overdueCount: 0,
    avgOverdueDays: 0,
  };

  const handleOpenCollectModal = (item: PendingFee) => {
    setCollectItem(item);
    setCollectAmount(item.dueAmount);
    setCollectNotes(`Collection for Installment #${item.installmentNo}`);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectItem || collectAmount <= 0) return;

    try {
      await collectFeeMutation.mutateAsync({
        id: collectItem.id,
        payload: {
          amountPaidNow: collectAmount,
          method: collectMethod,
          transactionRef: collectRef,
          notes: collectNotes,
        },
      });

      setCollectItem(null);
      setCollectRef("");
      setCollectNotes("");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to record fee collection");
    }
  };

  const handleSendReminder = async (item: PendingFee) => {
    try {
      setReminderSentId(item.id);
      await sendReminderMutation.mutateAsync(item.id);
      setTimeout(() => {
        setReminderSentId(null);
      }, 3000);
    } catch (err: any) {
      setReminderSentId(null);
      alert(err?.response?.data?.message || "Failed to send reminder");
    }
  };

  const getStatusBadge = (st: string, overdueDays: number) => {
    switch (st) {
      case "OVERDUE":
        return <Badge variant="destructive" className="font-semibold animate-pulse">{overdueDays} Days Overdue</Badge>;
      case "DUE_SOON":
        return <Badge variant="warning">Due Soon</Badge>;
      case "PARTIAL":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Partially Paid</Badge>;
      case "PAID":
        return <Badge variant="success">Fully Paid</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Pending Dues & Installments</h2>
          <p className="text-sm text-text-secondary">
            Monitor unpaid course fees, track overdue student accounts, collect pending installments, and send automated reminders.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Outstanding Dues</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{stats.totalPendingDues.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Total Overdue Dues</p>
              <h3 className="text-2xl font-bold text-text-primary">₹{stats.overdueDues.toLocaleString("en-IN")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Overdue Accounts</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats.overdueCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-bg-secondary shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-[#1769AA]">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Delay Period</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats.avgOverdueDays} Days</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table & Filters */}
      <Card className="border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search student name, admission no, phone, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#1769AA]"
              >
                <option value="ALL">All Due Statuses</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_SOON">Due Soon</option>
                <option value="PARTIAL">Partially Paid</option>
              </select>
            </div>
          </div>

          {/* Pending Fees Table */}
          <div className="rounded-md border border-border/50 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Student & Phone</TableHead>
                  <TableHead className="font-semibold text-text-primary">Admission No</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">Total Fee</TableHead>
                  <TableHead className="font-semibold text-text-primary">Paid / Due</TableHead>
                  <TableHead className="font-semibold text-text-primary">Due Date</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1769AA]" />
                        Loading pending fee records...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-text-secondary">
                      No pending fee dues match your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingFees.map((pf) => (
                    <TableRow key={pf.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <TableCell>
                        <div className="font-medium text-text-primary">{pf.studentName}</div>
                        <div className="text-xs text-text-secondary font-mono">{pf.phone}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-slate-800">
                        {pf.admissionNo}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-slate-700 font-medium">
                        {pf.courseName}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        ₹{pf.totalFee.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="text-emerald-700 font-medium text-xs">
                          Paid: ₹{pf.amountPaid.toLocaleString("en-IN")}
                        </div>
                        <div className="text-red-700 font-bold text-sm">
                          Due: ₹{pf.dueAmount.toLocaleString("en-IN")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        {new Date(pf.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(pf.status, pf.overdueDays)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-[#1769AA] hover:bg-[#F39A16] text-white text-xs h-8"
                            onClick={() => handleOpenCollectModal(pf)}
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Collect Fee
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs h-8"
                            onClick={() => handleSendReminder(pf)}
                            disabled={reminderSentId === pf.id || sendReminderMutation.isPending}
                          >
                            {reminderSentId === pf.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 animate-bounce" /> Sent!
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Collect Fee Modal */}
      {collectItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Fee Collection</h3>
                <p className="text-xs text-slate-500">Student: {collectItem.studentName} ({collectItem.admissionNo})</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCollectItem(null)}>✕</Button>
            </div>

            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Enrolled Course:</span>
                  <span className="font-semibold text-slate-900">{collectItem.courseName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Course Fee:</span>
                  <span className="font-semibold text-slate-900">₹{collectItem.totalFee.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Outstanding Due:</span>
                  <span className="font-bold text-red-600">₹{collectItem.dueAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Amount Collecting Now (₹) *</label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={collectItem.dueAmount}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Method *</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
                  className="w-full h-10 px-3 border rounded-md text-sm border-slate-300 focus:ring-2 focus:ring-[#1769AA]"
                >
                  <option value="">Select Payment Mode</option>
                  {paymentModeOptions.map((opt) => (
                    <option key={opt.value} value={opt.label}>{opt.label}</option>
                  ))}
                  {paymentModeOptions.length === 0 && (
                    <option value="" disabled>No modes — add in Master Setup</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Ref / Note</label>
                <Input
                  placeholder="e.g. UPI/77192840192 or Cash receipt"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setCollectItem(null)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#1769AA] hover:bg-[#F39A16] text-white"
                  disabled={collectFeeMutation.isPending}
                >
                  {collectFeeMutation.isPending ? "Processing..." : "Confirm & Issue Receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
