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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, MetricGrid, FilterToolbar, PageSection } from "@/components/layout";

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
        return <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case "FOLLOW_UPS":
      case "COUNSELLING_SESSIONS":
        return <PhoneCall className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
      case "ADMISSIONS":
      case "CONVERTED_LEADS":
        return <UserCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case "ADMISSION_REVENUE":
      case "FEE_COLLECTION":
        return <DollarSign className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
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
    <PageContainer>
      {/* Toast Notification */}
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

      <PageHeader
        title="My Targets & Incentives"
        description="Monthly goals and achievement progress."
        actions={
          <Button
            type="button"
            onClick={() => {
              refetchCurrent();
              showToast("✓ Refreshed live target data.");
            }}
            className="h-9 px-4 text-xs font-semibold gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      <MetricGrid density="compact">
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Goals</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5">{targets.length}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned for current cycle</p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Achievement</p>
            <h3
              className={`text-xl font-bold mt-0.5 ${
                avgAchievement >= 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : avgAchievement >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {avgAchievement}%
            </h3>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
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
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Potential Reward</p>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurrency(totalPotentialIncentive)}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Current estimated payout</p>
          </CardContent>
        </Card>
        <Card size="compact" className="border border-border/80 bg-card rounded-xl shadow-2xs">
          <CardContent size="compact">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cycle Status</p>
            <h3 className="text-base font-bold text-foreground mt-0.5">
              {targets[0]?.targetPlan?.name || "Active Monthly Cycle"}
            </h3>
            <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
              {targets[0]?.daysRemaining !== undefined
                ? `${targets[0].daysRemaining} days remaining in cycle`
                : "Ongoing cycle"}
            </p>
          </CardContent>
        </Card>
      </MetricGrid>

      <FilterToolbar>
        <button
          onClick={() => setActiveTab("active")}
          className={`h-9 px-5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <TargetIcon className="w-4 h-4" />
          Active Targets ({targets.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`h-9 px-5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Clock className="w-4 h-4" />
          Achievement & Incentive History
        </button>
      </FilterToolbar>

      <PageSection title={activeTab === "active" ? "Active targets" : "Incentive history"}>
      {activeTab === "active" && (
        <div className="space-y-4">
          {currentLoading ? (
            <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl shadow-xs">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 dark:text-indigo-400 mb-3" />
              <p className="font-medium">Loading live performance metrics...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl shadow-xs">
              <TargetIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No Active Targets Assigned</h3>
              <p className="text-sm text-muted-foreground">
                You do not have any active targets assigned for this cycle. Check back later or contact your Center Manager.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    className="bg-card border border-border hover:border-primary/40 transition rounded-xl p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-muted border border-border rounded-xl">
                            {getMetricIcon(target.metric)}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-base">{target.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                {target.metric.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
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
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : isNear
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
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
                          <span className="text-muted-foreground text-xs font-medium uppercase">
                            Progress
                          </span>
                          <span
                            className={`font-bold ${
                              isAchieved
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isNear
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-muted h-3 rounded-full overflow-hidden p-0.5 border border-border">
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
                      <div className="grid grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border border-border mb-6">
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                            Target
                          </span>
                          <span className="text-base font-bold text-foreground">
                            {target.unit === "INR"
                              ? formatCurrency(targetVal)
                              : targetVal.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                            Achieved
                          </span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {target.unit === "INR"
                              ? formatCurrency(achievedVal)
                              : achievedVal.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                            Remaining
                          </span>
                          <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                            {target.unit === "INR"
                              ? formatCurrency(remaining)
                              : remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Incentive Rule Breakdown */}
                      {target.incentiveRule && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 p-3.5 rounded-xl text-xs space-y-2 mb-4">
                          <div className="flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-300">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Incentive Rule: {target.incentiveRule.incentiveType}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Earned: {formatCurrency(incentive)}
                            </span>
                          </div>

                          {target.incentiveRule.incentiveType === "FIXED" && (
                            <p className="text-foreground">
                              Fixed payout of{" "}
                              <strong className="text-foreground">
                                {formatCurrency(Number(target.incentiveRule.fixedAmount || 0))}
                              </strong>{" "}
                              upon 100% completion.
                            </p>
                          )}

                          {target.incentiveRule.incentiveType === "SLAB" &&
                            target.incentiveRule.slabs && (
                              <div className="grid grid-cols-2 gap-1 text-[11px] text-foreground pt-1 border-t border-indigo-200 dark:border-indigo-900/40">
                                {target.incentiveRule.slabs.map((slab, idx) => {
                                  const usesValue =
                                    slab.minValue !== undefined && slab.maxValue !== undefined;
                                  const isActive = usesValue
                                    ? achievedVal >= Number(slab.minValue) &&
                                      achievedVal <= Number(slab.maxValue)
                                    : percentage >= Number(slab.minPercent ?? 0) &&
                                      percentage <= Number(slab.maxPercent ?? 0);
                                  const rangeLabel = usesValue
                                    ? `${Number(slab.minValue).toLocaleString()} – ${Number(slab.maxValue).toLocaleString()}`
                                    : `${slab.minPercent}% – ${slab.maxPercent}%`;
                                  return (
                                    <div
                                      key={idx}
                                      className={`px-2 py-1 rounded ${
                                        isActive
                                          ? "bg-indigo-600 text-white font-bold"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {rangeLabel}:{" "}
                                      <span
                                        className={
                                          isActive
                                            ? "text-yellow-200"
                                            : "text-amber-600 dark:text-amber-400"
                                        }
                                      >
                                        {formatCurrency(slab.amount)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                        {target.incentiveRule.incentiveType === "PERCENTAGE" &&
                          target.incentiveRule.percentages && (
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-foreground pt-1 border-t border-indigo-200 dark:border-indigo-900/40">
                              {target.incentiveRule.percentages.map((pct, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-1 rounded ${
                                    percentage >= pct.minPercent &&
                                    percentage <= pct.maxPercent
                                      ? "bg-indigo-600 text-white font-bold"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {pct.minPercent}% - {pct.maxPercent}%:{" "}
                                  <span className={percentage >= pct.minPercent && percentage <= pct.maxPercent ? "text-yellow-200" : "text-amber-600 dark:text-amber-400"}>
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
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Last calculated:{" "}
                        {p?.calculatedAt
                          ? new Date(p.calculatedAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Recently"}
                      </span>
                      <button
                        onClick={() => handleRecalculate(target.id)}
                        disabled={recalculateMutation.isPending}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-muted transition cursor-pointer disabled:opacity-50"
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
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Settled Incentives & Past Targets</h3>
              <p className="text-xs text-muted-foreground">
                Official payouts and completed target evaluation records.
              </p>
            </div>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 dark:text-indigo-400 mb-2" />
              Loading history...
            </div>
          ) : !historyData?.incentives || historyData.incentives.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm">No settled incentive records found for past cycles.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
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
                <tbody className="divide-y divide-border">
                  {historyData.incentives.map((inc: Incentive) => (
                    <tr key={inc.id} className="hover:bg-muted/50 transition">
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {new Date(inc.periodStart).toLocaleDateString()} -{" "}
                        {new Date(inc.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground">
                          {inc.target?.title || "Monthly Target"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {inc.target?.metric}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="text-muted-foreground">
                          Target: {Number(inc.targetValue).toLocaleString()}
                        </span>
                        <br />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Achieved: {Number(inc.achievedValue).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {Number(inc.achievementPercentage)}%
                      </td>
                      <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-semibold">
                        {formatCurrency(Number(inc.calculatedAmount))}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {inc.approvedAmount ? formatCurrency(Number(inc.approvedAmount)) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </PageSection>
    </PageContainer>
  );
};
