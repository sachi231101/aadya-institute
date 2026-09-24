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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout";
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
  const [collectStudent, setCollectStudent] = useState<{
    id: string;
    name: string;
    admissionNo?: string | null;
    outstanding: number;
    installmentNo: number;
  } | null>(null);
  const { toast, showToast, clearToast } = useFeeToast();

  const openLines = pendingData?.data?.data;
  /** One row per student + installment (no course-wise split). */
  const pendingFees = React.useMemo(() => {
    const lines = (openLines || []).filter(
      (pf) => Number(pf.dueAmount) > 0 && pf.status !== "PAID"
    );
    type Row = PendingFee & { sourceIds: string[] };
    const map = new Map<string, Row>();
    for (const pf of lines) {
      const inst = pf.installmentNo || 1;
      const key = `${pf.studentId || pf.studentName}::${inst}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          ...pf,
          dueAmount: Number(pf.dueAmount),
          amountPaid: Number(pf.amountPaid),
          sourceIds: [pf.id],
        });
        continue;
      }
      existing.dueAmount = Number(existing.dueAmount) + Number(pf.dueAmount);
      existing.amountPaid = Number(existing.amountPaid) + Number(pf.amountPaid);
      existing.sourceIds.push(pf.id);
      if (new Date(pf.dueDate) < new Date(existing.dueDate)) {
        existing.dueDate = pf.dueDate;
      }
      if (pf.status === "OVERDUE" || existing.overdueDays < pf.overdueDays) {
        existing.status = pf.status === "OVERDUE" ? "OVERDUE" : existing.status;
        existing.overdueDays = Math.max(existing.overdueDays, pf.overdueDays);
      }
    }
    return [...map.values()].sort((a, b) => {
      const byName = a.studentName.localeCompare(b.studentName);
      if (byName !== 0) return byName;
      return (a.installmentNo || 1) - (b.installmentNo || 1);
    });
  }, [openLines]);

  const stats = statsData?.data || {
    totalPendingDues: 0,
    overdueDues: 0,
    overdueCount: 0,
    avgOverdueDays: 0,
  };

  const handleCollect = (row: PendingFee & { sourceIds?: string[] }) => {
    const sources = row.sourceIds?.length ? row.sourceIds : [row.id];
    if (sources.length > 1 && row.studentId) {
      setCollectItem(null);
      setCollectStudent({
        id: row.studentId,
        name: row.studentName,
        admissionNo: row.admissionNo,
        outstanding: Number(row.dueAmount),
        installmentNo: row.installmentNo || 1,
      });
      return;
    }
    setCollectStudent(null);
    setCollectItem({ ...row, dueAmount: Number(row.dueAmount) });
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

  const body = (
    <>
      {!embedded && (
        <PageHeader
          title="Pending Dues & Installments"
          description="Monitor unpaid course fees, track overdue student accounts, collect pending installments, and send automated reminders."
        />
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
                <h3 className="text-2xl font-bold text-text-primary">
                  ₹{stats.totalPendingDues.toLocaleString("en-IN")}
                </h3>
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
                <h3 className="text-2xl font-bold text-text-primary">
                  ₹{stats.overdueDues.toLocaleString("en-IN")}
                </h3>
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
              <div className="p-3 rounded-lg bg-blue-50 text-primary">
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
      <Card className="w-full border-border/50 shadow-sm bg-bg-primary">
        <CardContent className="sm:p-6 p-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search student name, admission no, phone, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-bg-secondary border-border/50"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3 shrink-0">
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
                className="h-10 px-3 py-2 bg-bg-secondary border border-border/50 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Due Statuses</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="DUE_SOON">Due Soon</option>
                <option value="DUE_THIS_WEEK">Due This Week</option>
                <option value="PARTIAL">Partially Paid</option>
              </select>
            </div>
          </div>

          {/* Simple list: Student · Installment · Due (no course split) */}
          <div className="rounded-md border border-border/50 overflow-x-auto bg-white w-full">
            <Table className="w-full">
              <TableHeader className="bg-bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold text-text-primary">Student</TableHead>
                  <TableHead className="font-semibold text-text-primary">Installment</TableHead>
                  <TableHead className="font-semibold text-text-primary text-right">Total Paid</TableHead>
                  <TableHead className="font-semibold text-text-primary text-right">Due Amount</TableHead>
                  <TableHead className="font-semibold text-text-primary">Due Date</TableHead>
                  <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pendingLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        Loading pending fee records...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pendingFees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      No pending installment dues match your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingFees.map((pf) => (
                    <TableRow
                      key={`${pf.studentId || pf.studentName}-${pf.installmentNo}`}
                      className="hover:bg-bg-secondary/30 transition-colors"
                    >
                      <TableCell>
                        <div className="font-medium text-text-primary">{pf.studentName}</div>
                        <div className="text-xs text-text-secondary font-mono">{pf.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-text-primary text-base">
                          {pf.installmentNo || 1}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-emerald-700 font-semibold text-base">
                          ₹{Number(pf.amountPaid).toLocaleString("en-IN")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-red-700 font-bold text-base">
                          ₹{Number(pf.dueAmount).toLocaleString("en-IN")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-700">
                        {new Date(pf.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionGate itemKey="fees.students" mode="write">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-[#F39A16] text-white text-xs h-8"
                              onClick={() => handleCollect(pf)}
                            >
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Collect Fee
                            </Button>
                          </PermissionGate>

                          <PermissionGate itemKey="fees.students" mode="write">
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
      {collectStudent && (
        <CollectFeeModal
          mode="student"
          student={{
            id: collectStudent.id,
            name: collectStudent.name,
            admissionNo: collectStudent.admissionNo,
            outstanding: collectStudent.outstanding,
          }}
          onClose={() => setCollectStudent(null)}
          onSuccess={(msg) => showToast(msg, "success")}
        />
      )}
      <FeeToastBanner toast={toast} onClose={clearToast} />
    </>
  );

  if (embedded) {
    return <div className="w-full min-w-0">{body}</div>;
  }

  return <PageContainer>{body}</PageContainer>;
};
