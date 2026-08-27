import React, { useState } from "react";
import {
  Target as TargetIcon,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  PhoneCall,
  UserCheck,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  useMyCurrentTargets,
  useMyPerformanceHistory,
  useRecalculateTarget,
} from "../../hooks/useTargets";
import type { Target, Incentive } from "../../types/target.types";

export const CounselorPerformance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const { data: currentData, isLoading: currentLoading, refetch: refetchCurrent } = useMyCurrentTargets();
  const { data: historyData, isLoading: historyLoading } = useMyPerformanceHistory();
  const recalculateMutation = useRecalculateTarget();

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleRecalculate = async (targetId: string) => {
    try {
      await recalculateMutation.mutateAsync(targetId);
      await refetchCurrent();
      showToast("✓ Live target metrics recalculated from CRM records!");
    } catch {
      showToast("❌ Failed to recalculate target metrics");
    }
  };

  const targets = currentData?.targets || [];
  const totalPotentialIncentive = currentData?.summary.totalPotentialIncentive || 0;

  // Calculate average achievement %
  const avgAchievement =
    targets.length > 0
      ? Math.round(
          targets.reduce(
            (sum, t) => sum + Number(t.currentProgress?.achievementPercentage || 0),
            0
          ) / targets.length
        )
      : 0;

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case "LEADS_CREATED":
      case "LEADS_CONTACTED":
        return <Users className="w-5 h-5 text-indigo-400" />;
      case "FOLLOW_UPS":
      case "COUNSELLING_SESSIONS":
        return <PhoneCall className="w-5 h-5 text-sky-400" />;
      case "ADMISSIONS":
      case "CONVERTED_LEADS":
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case "ADMISSION_REVENUE":
      case "FEE_COLLECTION":
        return <DollarSign className="w-5 h-5 text-amber-400" />;
      default:
        return <TargetIcon className="w-5 h-5 text-primary" />;
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white border border-slate-700 shadow-2xl px-5 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
              <Award className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">My Targets & Incentive Rewards</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Track your assigned monthly goals, real-time CRM achievements, and potential reward earnings.
          </p>
        </div>
        <button
          onClick={() => {
            refetchCurrent();
            showToast("✓ Refreshed live target data.");
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-sm rounded-xl transition border border-indigo-400/30 shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Live Data
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Goals
            </span>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <TargetIcon className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{targets.length}</div>
          <p className="text-xs text-slate-400">Assigned for current cycle</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Achievement
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className={`text-3xl font-bold ${
                avgAchievement >= 100
                  ? "text-emerald-400"
                  : avgAchievement >= 70
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {avgAchievement}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                avgAchievement >= 100
                  ? "bg-emerald-500"
                  : avgAchievement >= 70
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(avgAchievement, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Potential Reward
            </span>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-1">
            {formatCurrency(totalPotentialIncentive)}
          </div>
          <p className="text-xs text-slate-400">Current estimated payout</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cycle Status
            </span>
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div className="text-lg font-bold text-white mb-1">
            {targets[0]?.targetPlan?.name || "Active Monthly Cycle"}
          </div>
          <p className="text-xs text-sky-400 font-medium">
            {targets[0]?.daysRemaining !== undefined
              ? `${targets[0].daysRemaining} days remaining in cycle`
              : "Ongoing cycle"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <TargetIcon className="w-4 h-4" />
          Active Targets ({targets.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Clock className="w-4 h-4" />
          Achievement & Incentive History
        </button>
      </div>

      {/* Tab Content: Active Targets */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {currentLoading ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
              <p className="font-medium">Loading live performance metrics...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <TargetIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Active Targets Assigned</h3>
              <p className="text-sm text-slate-400">
                You do not have any active targets assigned for this cycle. Check back later or contact your Center Manager.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {targets.map((target) => {
                const p = target.currentProgress;
                const percentage = p?.achievementPercentage || 0;
                const targetVal = Number(target.targetValue);
                const achievedVal = p?.achievedValue || 0;
                const remaining = p?.remainingValue || 0;
                const incentive = p?.potentialIncentive || 0;

                const isAchieved = percentage >= 100;
                const isNear = percentage >= 75 && percentage < 100;

                return (
                  <div
                    key={target.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition rounded-2xl p-6 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl">
                            {getMetricIcon(target.metric)}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base">{target.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {target.metric.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {target.daysRemaining !== undefined
                                  ? `${target.daysRemaining}d left`
                                  : "Active"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                            isAchieved
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : isNear
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isAchieved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> In Progress
                            </>
                          )}
                        </span>
                      </div>

                      {/* Progress Bar & Achievement Percentage */}
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-baseline text-sm">
                          <span className="text-slate-400 text-xs font-medium uppercase">
                            Progress
                          </span>
                          <span
                            className={`font-bold ${
                              isAchieved
                                ? "text-emerald-400"
                                : isNear
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isAchieved
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : isNear
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : "bg-gradient-to-r from-rose-500 to-pink-500"
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Numbers Grid */}
                      <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mb-6">
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block mb-1">
                            Target
                          </span>
                          <span className="text-base font-bold text-white">
                            {target.unit === "INR"
                              ? formatCurrency(targetVal)
                              : targetVal.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block mb-1">
                            Achieved
                          </span>
                          <span className="text-base font-bold text-emerald-400">
                            {target.unit === "INR"
                              ? formatCurrency(achievedVal)
                              : achievedVal.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block mb-1">
                            Remaining
                          </span>
                          <span className="text-base font-bold text-rose-300">
                            {target.unit === "INR"
                              ? formatCurrency(remaining)
                              : remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Incentive Rule Breakdown */}
                      {target.incentiveRule && (
                        <div className="bg-indigo-950/20 border border-indigo-900/30 p-3.5 rounded-xl text-xs space-y-2 mb-4">
                          <div className="flex items-center justify-between font-semibold text-indigo-300">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              Incentive Rule: {target.incentiveRule.incentiveType}
                            </span>
                            <span className="text-amber-400 font-bold">
                              Earned: {formatCurrency(incentive)}
                            </span>
                          </div>

                          {target.incentiveRule.incentiveType === "FIXED" && (
                            <p className="text-slate-300">
                              Fixed payout of{" "}
                              <strong className="text-white">
                                {formatCurrency(Number(target.incentiveRule.fixedAmount || 0))}
                              </strong>{" "}
                              upon 100% completion.
                            </p>
                          )}

                          {target.incentiveRule.incentiveType === "SLAB" &&
                            target.incentiveRule.slabs && (
                              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1 border-t border-indigo-900/40">
                                {target.incentiveRule.slabs.map((slab, idx) => (
                                  <div
                                    key={idx}
                                    className={`px-2 py-1 rounded ${
                                      percentage >= slab.minPercent &&
                                      percentage <= slab.maxPercent
                                    ? "bg-indigo-600/40 text-white font-bold border border-indigo-500/40"
                                    : "text-slate-400"
                                  }`}
                                >
                                  {slab.minPercent}% - {slab.maxPercent}%:{" "}
                                  <span className="text-amber-300">
                                    {formatCurrency(slab.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        {target.incentiveRule.incentiveType === "PERCENTAGE" &&
                          target.incentiveRule.percentages && (
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 pt-1 border-t border-indigo-900/40">
                              {target.incentiveRule.percentages.map((pct, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-1 rounded ${
                                    percentage >= pct.minPercent &&
                                    percentage <= pct.maxPercent
                                      ? "bg-indigo-600/40 text-white font-bold border border-indigo-500/40"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {pct.minPercent}% - {pct.maxPercent}%:{" "}
                                  <span className="text-amber-300">
                                    {pct.ratePercent}% of Revenue
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                    </div>

                    {/* Card Footer Action */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Last calculated:{" "}
                        {p?.calculatedAt
                          ? new Date(p.calculatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently"}
                      </span>
                      <button
                        onClick={() => handleRecalculate(target.id)}
                        disabled={recalculateMutation.isPending}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            recalculateMutation.isPending ? "animate-spin" : ""
                          }`}
                        />
                        Recalculate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: History */}
      {activeTab === "history" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Settled Incentives & Past Targets</h3>
              <p className="text-xs text-slate-400">
                Official payouts and completed target evaluation records.
              </p>
            </div>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading history...
            </div>
          ) : !historyData?.incentives || historyData.incentives.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">No settled incentive records found for past cycles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Target Goal</th>
                    <th className="py-3.5 px-4">Target vs Achieved</th>
                    <th className="py-3.5 px-4">Achievement %</th>
                    <th className="py-3.5 px-4">Calculated Reward</th>
                    <th className="py-3.5 px-4">Approved Payout</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {historyData.incentives.map((inc: Incentive) => (
                    <tr key={inc.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-medium text-white">
                        {new Date(inc.periodStart).toLocaleDateString()} -{" "}
                        {new Date(inc.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">
                          {inc.target?.title || "Monthly Target"}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {inc.target?.metric}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-slate-400">
                          Target: {Number(inc.targetValue).toLocaleString()}
                        </span>
                        <br />
                        <span className="text-emerald-400 font-semibold">
                          Achieved: {Number(inc.achievedValue).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {Number(inc.achievementPercentage)}%
                      </td>
                      <td className="py-3.5 px-4 text-amber-300 font-semibold">
                        {formatCurrency(Number(inc.calculatedAmount))}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {inc.approvedAmount ? formatCurrency(Number(inc.approvedAmount)) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            inc.status === "APPROVED" || inc.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : inc.status === "PENDING_APPROVAL"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {inc.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
