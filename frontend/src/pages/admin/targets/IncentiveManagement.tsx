import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  DollarSign,
  UserCheck,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import {
  useIncentives,
  useApproveIncentive,
  useRejectIncentive,
} from "../../../hooks/useTargets";
import { useAuthStore } from "../../../store/auth.store";
import type { Incentive, IncentiveStatus } from "../../../types/target.types";

export const IncentiveManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: incentivesData, isLoading, refetch } = useIncentives({
    status: statusFilter !== "ALL" ? (statusFilter as IncentiveStatus) : undefined,
  });

  const approveMutation = useApproveIncentive();
  const rejectMutation = useRejectIncentive();

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Modals
  const [selectedIncentive, setSelectedIncentive] = useState<Incentive | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form State
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleOpenApprove = (inc: Incentive) => {
    setSelectedIncentive(inc);
    setApprovedAmount(Number(inc.calculatedAmount));
    setAdjustmentNotes(inc.adjustmentNotes || "");
    setShowApproveModal(true);
  };

  const handleOpenReject = (inc: Incentive) => {
    setSelectedIncentive(inc);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncentive) return;

    try {
      await approveMutation.mutateAsync({
        id: selectedIncentive.id,
        data: {
          approvedAmount,
          notes: adjustmentNotes.trim() || undefined,
        },
      });
      showToast("✓ Incentive successfully approved for payroll processing!");
      setShowApproveModal(false);
      setSelectedIncentive(null);
    } catch (err: any) {
      showToast(`❌ ${err?.response?.data?.message || "Approval failed"}`);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncentive) return;
    if (!rejectionReason.trim()) {
      alert("Rejection reason is required");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        id: selectedIncentive.id,
        data: { reason: rejectionReason.trim() },
      });
      showToast("✓ Incentive marked as Rejected.");
      setShowRejectModal(false);
      setSelectedIncentive(null);
    } catch (err: any) {
      showToast(`❌ ${err?.response?.data?.message || "Rejection failed"}`);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const incentives = incentivesData?.data || [];
  const filtered = incentives.filter(
    (inc) =>
      inc.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      inc.target?.title.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = incentives.filter((i) => i.status === "PENDING_APPROVAL").length;
  const approvedTotal = incentives
    .filter((i) => i.status === "APPROVED" || i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.approvedAmount || i.calculatedAmount || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-card text-foreground border border-border shadow-2xl px-5 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium">{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-muted-foreground hover:text-foreground text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl">
              <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Incentive Approvals & Payouts
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Review automatically calculated counselor rewards, apply administrative adjustments, and authorize payouts.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-xl border border-border transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Refresh
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting management review</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approved Rewards
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            {formatCurrency(approvedTotal)}
          </div>
          <p className="text-xs text-muted-foreground">Queued for monthly payroll</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Claims
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">{incentives.length}</div>
          <p className="text-xs text-muted-foreground">System calculated records</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search counselor or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PAID">Paid / Processed</option>
          </select>
        </div>
      </div>

      {/* Incentives Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 dark:text-indigo-400 mb-3" />
            <p>Loading incentive records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">No Incentives Found</h3>
            <p className="text-xs text-muted-foreground">
              No incentive records match the current status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-4 px-4">Counselor</th>
                  <th className="py-4 px-4">Target Goal</th>
                  <th className="py-4 px-4">Target vs Achieved</th>
                  <th className="py-4 px-4">Achievement %</th>
                  <th className="py-4 px-4">Calculated Amount</th>
                  <th className="py-4 px-4">Approved Amount</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inc) => (
                  <tr key={inc.id} className="hover:bg-muted/50 transition">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-foreground">{inc.user?.name}</div>
                      <div className="text-xs text-muted-foreground">{inc.branch?.name || "All Branches"}</div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-foreground">
                        {inc.target?.title || "Monthly Target"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(inc.periodStart).toLocaleDateString()} -{" "}
                        {new Date(inc.periodEnd).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      <span className="text-muted-foreground">
                        Target: {Number(inc.targetValue).toLocaleString()}
                      </span>
                      <br />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Achieved: {Number(inc.achievedValue).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-foreground">
                      {Number(inc.achievementPercentage)}%
                    </td>

                    <td className="py-4 px-4 font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(Number(inc.calculatedAmount))}
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {inc.approvedAmount ? formatCurrency(Number(inc.approvedAmount)) : "—"}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          inc.status === "APPROVED" || inc.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : inc.status === "PENDING_APPROVAL"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {inc.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      {inc.status === "PENDING_APPROVAL" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenApprove(inc)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenReject(inc)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs shadow-rose-600/20"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}

                      {inc.status === "APPROVED" && (
                        <span className="text-xs text-muted-foreground">
                          Approved by {inc.approvedBy?.name || "Admin"}
                        </span>
                      )}

                      {inc.status === "REJECTED" && (
                        <span className="text-xs text-rose-600 dark:text-rose-400" title={inc.rejectionReason || ""}>
                          Reason: {inc.rejectionReason || "Declined"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: APPROVE INCENTIVE ─── */}
      {showApproveModal && selectedIncentive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-lg">Approve Incentive Reward</h3>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-sm">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Counselor:</span>
                  <span className="text-foreground font-bold">{selectedIncentive.user?.name}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Target:</span>
                  <span className="text-foreground">{selectedIncentive.target?.title}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Calculated Amount:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {formatCurrency(Number(selectedIncentive.calculatedAmount))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Final Approved Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-base text-emerald-600 dark:text-emerald-400"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  You can adjust the payout amount upward or downward if needed.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Adjustment / Approval Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Excellent admission conversion rate for high-ticket batch."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition cursor-pointer border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {approveMutation.isPending ? "Approving..." : "Confirm & Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: REJECT INCENTIVE ─── */}
      {showRejectModal && selectedIncentive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-bold text-lg">Reject Incentive Claim</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this incentive is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition cursor-pointer border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
