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
import { usePendingFees, useFeeStats, useSendFeeReminder } from "../../../hooks/useFees";
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
import type { PendingFee } from "../../../types/fee.types";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { CollectFeeModal } from "./CollectFeeModal";
import { FeeToastBanner, useFeeToast } from "./FeeToast";

interface PendingFeesProps {
  embedded?: boolean;
  initialDueWithinDays?: number;
}

export const PendingFees: React.FC<PendingFeesProps> = ({
  embedded = false,
  initialDueWithinDays,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dueWithinDays, setDueWithinDays] = useState<number | undefined>(initialDueWithinDays);
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  React.useEffect(() => {
    setDueWithinDays(initialDueWithinDays);
    if (initialDueWithinDays === 7) {
      setStatusFilter("DUE_THIS_WEEK");
    } else if (initialDueWithinDays == null) {
      setStatusFilter((prev) => (prev === "DUE_THIS_WEEK" ? "ALL" : prev));
    }
  }, [initialDueWithinDays]);

  const { data: pendingData, isLoading: pendingLoading } = usePendingFees({
    search: searchTerm,
    status: statusFilter === "DUE_THIS_WEEK" ? "UNPAID" : statusFilter,
    dueWithinDays:
      statusFilter === "DUE_THIS_WEEK" ? 7 : dueWithinDays,
  });

  const { data: statsData } = useFeeStats();
  const sendReminderMutation = useSendFeeReminder();
  const [collectItem, setCollectItem] = useState<PendingFee | null>(null);
  const { toast, showToast, clearToast } = useFeeToast();

  const pendingFees = pendingData?.data?.data || [];
  const stats = statsData?.data || {
    totalPendingDues: 0,
    overdueDues: 0,
    overdueCount: 0,
    avgOverdueDays: 0,
  };

  const handleSendReminder = async (item: PendingFee) => {
    try {
      setReminderSentId(item.id);
      const res = await sendReminderMutation.mutateAsync(item.id);
      const payload = res?.data;
      if (payload?.status === "SKIPPED") {
        showToast(
          payload.message || `Reminder skipped (${payload.skipReason || "unknown"})`,
          "info"
        );
      } else {
        showToast(payload?.message || "WhatsApp reminder queued", "success");
      }
      setTimeout(() => {
        setReminderSentId(null);
      }, 3000);
    } catch (err: unknown) {
      setReminderSentId(null);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to send reminder";
      showToast(message, "error");
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
      {!embedded && (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Pending Dues & Installments</h2>
          <p className="text-sm text-text-secondary">
            Monitor unpaid course fees, track overdue student accounts, collect pending installments, and send automated reminders.
          </p>
        </div>
      </div>
      )}

      {!embedded && (
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
            <div className="p-3 rounded-lg bg-blue-50 text-[#2563EB]">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Avg Delay Period</p>
              <h3 className="text-2xl font-bold text-text-primary">{stats.avgOverdueDays} Days</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

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
                value={
                  dueWithinDays === 7 || statusFilter === "DUE_THIS_WEEK"
                    ? "DUE_THIS_WEEK"
                    : statusFilter
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "DUE_THIS_WEEK") {
                    setStatusFilter("DUE_THIS_WEEK");
                    setDueWithinDays(7);
                  } else {
                    setStatusFilter(value);
                    setDueWithinDays(undefined);
                  }
                }}
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="ALL">All Due Statuses</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_SOON">Due Soon</option>
                <option value="DUE_THIS_WEEK">Due This Week</option>
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
                  <TableHead className="font-semibold text-text-primary">Invoice</TableHead>
                  <TableHead className="font-semibold text-text-primary">Fee Head</TableHead>
                  <TableHead className="font-semibold text-text-primary">Installment</TableHead>
                  <TableHead className="font-semibold text-text-primary">Course</TableHead>
                  <TableHead className="font-semibold text-text-primary">This charge</TableHead>
                  <TableHead className="font-semibold text-text-primary">Paid / Due</TableHead>
                  <TableHead className="font-semibold text-text-primary">Due Date</TableHead>
                  <TableHead className="font-semibold text-text-primary">Status</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                        Loading pending fee records...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-text-secondary">
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
                      <TableCell className="font-mono text-xs text-slate-700">
                        {pf.invoiceNo || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        {pf.feeHead || "Fee"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        #{pf.installmentNo || 1}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-slate-700 font-medium">
                        {pf.courseName}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        ₹{(Number(pf.amountPaid) + Number(pf.dueAmount)).toLocaleString("en-IN")}
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
                          <PermissionGate itemKey="fees.pending" mode="write">
                            <Button
                              size="sm"
                              className="bg-[#2563EB] hover:bg-[#F39A16] text-white text-xs h-8"
                              onClick={() => setCollectItem(pf)}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Collect Fee
                            </Button>
                          </PermissionGate>

                          <PermissionGate itemKey="fees.pending" mode="write">
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
                          </PermissionGate>
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

      {collectItem && (
        <CollectFeeModal
          item={collectItem}
          onClose={() => setCollectItem(null)}
          onSuccess={(msg) => showToast(msg, "success")}
        />
      )}
      <FeeToastBanner toast={toast} onClose={clearToast} />
    </div>
  );
};
