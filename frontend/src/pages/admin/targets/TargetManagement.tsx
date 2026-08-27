import React, { useState } from "react";
import {
  Target as TargetIcon,
  Plus,
  Search,
  Filter,
  Layers,
  Calendar,
  Award,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Play,
  Share2,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  useTargetPlans,
  useTargets,
  useCreateTargetPlan,
  usePublishTargetPlan,
  useActivateTargetPlan,
  useLockTargetPlan,
  useCreateTarget,
  useUpdateTarget,
  useDeleteTarget,
  useRecalculateTarget,
} from "../../../hooks/useTargets";
import { useUsers } from "../../../hooks/useUsers";
import { useAuthStore } from "../../../store/auth.store";
import type {
  Target,
  TargetPlan,
  TargetPeriod,
  TargetMetric,
  TargetType,
  IncentiveType,
  IncentiveSlab,
  IncentivePercentageTier,
} from "../../../types/target.types";

export const TargetManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"targets" | "plans">("targets");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [metricFilter, setMetricFilter] = useState<string>("ALL");

  // API Hooks
  const { data: plansData, isLoading: plansLoading } = useTargetPlans();
  const { data: targetsData, isLoading: targetsLoading } = useTargets({
    search: search || undefined,
    status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
    metric: metricFilter !== "ALL" ? (metricFilter as any) : undefined,
  });
  const { data: usersData } = useUsers();

  // Mutations
  const createPlanMutation = useCreateTargetPlan();
  const publishPlanMutation = usePublishTargetPlan();
  const activatePlanMutation = useActivateTargetPlan();
  const lockPlanMutation = useLockTargetPlan();
  const createTargetMutation = useCreateTarget();
  const updateTargetMutation = useUpdateTarget();
  const deleteTargetMutation = useDeleteTarget();
  const recalculateMutation = useRecalculateTarget();

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Modals
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Form State: Target Plan
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planPeriod, setPlanPeriod] = useState<TargetPeriod>("MONTHLY");
  const [planStartDate, setPlanStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [planEndDate, setPlanEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]
  );

  // Form State: Target
  const [targetTitle, setTargetTitle] = useState("");
  const [targetPlanId, setTargetPlanId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("INDIVIDUAL");
  const [targetMetric, setTargetMetric] = useState<TargetMetric>("ADMISSIONS");
  const [targetValue, setTargetValue] = useState<number>(20);
  const [targetUnit, setTargetUnit] = useState("COUNT");
  const [targetStartDate, setTargetStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]
  );

  // Form State: Incentive Rule Builder
  const [enableIncentive, setEnableIncentive] = useState(true);
  const [incentiveType, setIncentiveType] = useState<IncentiveType>("SLAB");
  const [fixedAmount, setFixedAmount] = useState<number>(5000);
  const [slabs, setSlabs] = useState<IncentiveSlab[]>([
    { minPercent: 0, maxPercent: 49, amount: 0 },
    { minPercent: 50, maxPercent: 74, amount: 2000 },
    { minPercent: 75, maxPercent: 89, amount: 5000 },
    { minPercent: 90, maxPercent: 99, amount: 7500 },
    { minPercent: 100, maxPercent: 109, amount: 10000 },
    { minPercent: 110, maxPercent: 124, amount: 12500 },
    { minPercent: 125, maxPercent: 999, amount: 15000 },
  ]);
  const [percentages, setPercentages] = useState<IncentivePercentageTier[]>([
    { minPercent: 0, maxPercent: 79, ratePercent: 0 },
    { minPercent: 80, maxPercent: 99, ratePercent: 0.5 },
    { minPercent: 100, maxPercent: 109, ratePercent: 1.0 },
    { minPercent: 110, maxPercent: 124, ratePercent: 1.25 },
    { minPercent: 125, maxPercent: 999, ratePercent: 1.5 },
  ]);

  const resetTargetForm = () => {
    setEditingTarget(null);
    setTargetTitle("");
    setTargetPlanId(plansData?.[0]?.id || "");
    setTargetUserId("");
    setTargetType("INDIVIDUAL");
    setTargetMetric("ADMISSIONS");
    setTargetValue(20);
    setTargetUnit("COUNT");
    setEnableIncentive(true);
    setIncentiveType("SLAB");
    setFixedAmount(5000);
  };

  const handleOpenEditTarget = (t: Target) => {
    setEditingTarget(t);
    setTargetTitle(t.title);
    setTargetPlanId(t.targetPlanId || "");
    setTargetUserId(t.userId || "");
    setTargetType(t.targetType);
    setTargetMetric(t.metric);
    setTargetValue(Number(t.targetValue));
    setTargetUnit(t.unit);
    setTargetStartDate(new Date(t.startDate).toISOString().split("T")[0]);
    setTargetEndDate(new Date(t.endDate).toISOString().split("T")[0]);

    if (t.incentiveRule) {
      setEnableIncentive(true);
      setIncentiveType(t.incentiveRule.incentiveType);
      if (t.incentiveRule.fixedAmount) {
        setFixedAmount(Number(t.incentiveRule.fixedAmount));
      }
      if (t.incentiveRule.slabs) {
        setSlabs(t.incentiveRule.slabs);
      }
      if (t.incentiveRule.percentages) {
        setPercentages(t.incentiveRule.percentages);
      }
    } else {
      setEnableIncentive(false);
    }

    setShowTargetModal(true);
  };

  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      alert("Plan name is required");
      return;
    }

    try {
      await createPlanMutation.mutateAsync({
        name: planName.trim(),
        description: planDesc.trim() || undefined,
        periodType: planPeriod,
        startDate: planStartDate,
        endDate: planEndDate,
      });
      showToast("✓ Target Plan created successfully!");
      setShowCreatePlanModal(false);
      setPlanName("");
      setPlanDesc("");
    } catch {
      showToast("❌ Failed to create Target Plan");
    }
  };

  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTitle.trim()) {
      alert("Target title is required");
      return;
    }
    if (targetValue <= 0) {
      alert("Target value must be greater than zero");
      return;
    }

    const ruleInput = enableIncentive
      ? {
          incentiveType,
          fixedAmount: incentiveType === "FIXED" ? fixedAmount : undefined,
          slabs: incentiveType === "SLAB" ? slabs : undefined,
          percentages: incentiveType === "PERCENTAGE" ? percentages : undefined,
        }
      : undefined;

    try {
      if (editingTarget) {
        await updateTargetMutation.mutateAsync({
          id: editingTarget.id,
          data: {
            title: targetTitle.trim(),
            userId: targetUserId || undefined,
            targetType,
            metric: targetMetric,
            targetValue,
            unit: targetUnit,
            startDate: targetStartDate,
            endDate: targetEndDate,
            incentiveRule: ruleInput,
          },
        });
        showToast("✓ Target updated and progress recalculated!");
      } else {
        await createTargetMutation.mutateAsync({
          title: targetTitle.trim(),
          targetPlanId: targetPlanId || undefined,
          userId: targetUserId || undefined,
          targetType,
          metric: targetMetric,
          targetValue,
          unit: targetUnit,
          startDate: targetStartDate,
          endDate: targetEndDate,
          incentiveRule: ruleInput,
        });
        showToast("✓ New Target assigned successfully!");
      }

      setShowTargetModal(false);
      resetTargetForm();
    } catch (err: any) {
      showToast(`❌ ${err?.response?.data?.message || "Failed to save target"}`);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete target "${title}"?`)) {
      try {
        await deleteTargetMutation.mutateAsync(id);
        showToast(`✓ Target "${title}" deleted`);
      } catch {
        showToast("❌ Failed to delete target");
      }
    }
  };

  const handleRecalculate = async (id: string) => {
    try {
      await recalculateMutation.mutateAsync(id);
      showToast("✓ Target metrics recalculated from live database records!");
    } catch {
      showToast("❌ Failed to recalculate target metrics");
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const targets = targetsData?.data || [];
  const plans = plansData || [];
  const counselors = (usersData?.data || []).filter((u: any) => u.role === "COUNSELLOR" || !u.role);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white border border-slate-700 shadow-2xl px-5 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium">{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
              <TargetIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Target & Incentive Management</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Configure institute performance campaigns, assign measurable targets to counselors, and automate incentive payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreatePlanModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            New Campaign Plan
          </button>
          <button
            onClick={() => {
              resetTargetForm();
              setShowTargetModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Assign Target
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("targets")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "targets"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <TargetIcon className="w-4 h-4" />
          Assigned Targets ({targets.length})
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "plans"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Layers className="w-4 h-4" />
          Campaign Plans ({plans.length})
        </button>
      </div>

      {/* ─── TAB 1: ASSIGNED TARGETS TABLE ─── */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search targets by title or counselor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={metricFilter}
                onChange={(e) => setMetricFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Metrics</option>
                <option value="ADMISSIONS">Admissions</option>
                <option value="ADMISSION_REVENUE">Admission Revenue</option>
                <option value="LEADS_CREATED">Leads Created</option>
                <option value="FOLLOW_UPS">Follow Ups</option>
                <option value="COUNSELLING_SESSIONS">Counselling Sessions</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
                <option value="LOCKED">Locked</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          {/* Targets Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {targetsLoading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
                <p>Loading assigned targets...</p>
              </div>
            ) : targets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <TargetIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Targets Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No assigned targets match your search criteria. Click "Assign Target" to create one.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4">Target Title & Plan</th>
                      <th className="py-4 px-4">Assigned Counselor</th>
                      <th className="py-4 px-4">Metric</th>
                      <th className="py-4 px-4">Target vs Achieved</th>
                      <th className="py-4 px-4">Progress %</th>
                      <th className="py-4 px-4">Incentive Rule</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {targets.map((t) => {
                      const p = t.targetProgress?.[0];
                      const targetVal = Number(t.targetValue);
                      const achievedVal = p ? Number(p.achievedValue) : 0;
                      const percentage = p ? Number(p.achievementPercentage) : 0;
                      const potentialIncentive = p ? Number(p.potentialIncentive) : 0;

                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white text-sm">{t.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{t.targetPlan?.name || "Independent"}</span>
                              <span>•</span>
                              <span>
                                {new Date(t.startDate).toLocaleDateString()} -{" "}
                                {new Date(t.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {t.user ? (
                              <div>
                                <div className="font-semibold text-white">{t.user.name}</div>
                                <div className="text-xs text-slate-400">{t.branch?.name || "All Branches"}</div>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                Branch Team Goal
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                              {t.metric.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <span className="text-slate-400">Target: </span>
                              <strong className="text-white font-bold">
                                {t.unit === "INR"
                                  ? formatCurrency(targetVal)
                                  : targetVal.toLocaleString()}
                              </strong>
                            </div>
                            <div className="text-xs mt-0.5">
                              <span className="text-slate-400">Achieved: </span>
                              <strong className="text-emerald-400 font-bold">
                                {t.unit === "INR"
                                  ? formatCurrency(achievedVal)
                                  : achievedVal.toLocaleString()}
                              </strong>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="w-28 space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span
                                  className={
                                    percentage >= 100
                                      ? "text-emerald-400"
                                      : percentage >= 70
                                      ? "text-amber-400"
                                      : "text-rose-400"
                                  }
                                >
                                  {percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    percentage >= 100
                                      ? "bg-emerald-500"
                                      : percentage >= 70
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {t.incentiveRule ? (
                              <div className="text-xs">
                                <span className="font-semibold text-amber-300">
                                  {t.incentiveRule.incentiveType}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  Reward: {formatCurrency(potentialIncentive)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">None</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                t.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : t.status === "COMPLETED"
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                  : t.status === "LOCKED"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                title="Recalculate live progress"
                                onClick={() => handleRecalculate(t.id)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded-lg transition cursor-pointer"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              {t.status !== "LOCKED" && (
                                <>
                                  <button
                                    title="Edit target"
                                    onClick={() => handleOpenEditTarget(t)}
                                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    title="Delete target"
                                    onClick={() => handleDelete(t.id, t.title)}
                                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: CAMPAIGN PLANS ─── */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plansLoading ? (
              <div className="col-span-full p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
                <p>Loading campaign plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="col-span-full p-12 text-center text-slate-400 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Campaign Plans</h3>
                <p className="text-xs text-slate-400">
                  Create a structured monthly or quarterly campaign plan to bundle counselor targets.
                </p>
              </div>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition p-6 rounded-2xl shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {plan.periodType}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          plan.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : plan.status === "PUBLISHED"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                            : plan.status === "LOCKED"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {plan.description || "Campaign plan for academy counselor target tracking."}
                    </p>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5 mb-4">
                      <div className="flex justify-between text-slate-400">
                        <span>Duration:</span>
                        <span className="text-white font-medium">
                          {new Date(plan.startDate).toLocaleDateString()} -{" "}
                          {new Date(plan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Targets Bundled:</span>
                        <span className="text-indigo-400 font-bold">
                          {plan.targets?.length || 0} Targets
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Branch:</span>
                        <span className="text-slate-300">
                          {plan.branch?.name || "All Branches"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                    {plan.status === "DRAFT" && (
                      <button
                        onClick={async () => {
                          await publishPlanMutation.mutateAsync(plan.id);
                          showToast("✓ Plan Published!");
                        }}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Publish Plan
                      </button>
                    )}

                    {plan.status === "PUBLISHED" && (
                      <button
                        onClick={async () => {
                          await activatePlanMutation.mutateAsync(plan.id);
                          showToast("✓ Plan Activated!");
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Activate Drive
                      </button>
                    )}

                    {plan.status === "ACTIVE" && (
                      <button
                        onClick={async () => {
                          if (confirm("Locking this campaign will prevent further edits. Continue?")) {
                            await lockPlanMutation.mutateAsync(plan.id);
                            showToast("✓ Plan Locked!");
                          }
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Lock & Finalize
                      </button>
                    )}

                    {plan.status === "LOCKED" && (
                      <div className="w-full py-2 text-center text-xs text-purple-400 font-bold flex items-center justify-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Campaign Locked
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE CAMPAIGN PLAN ─── */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">Create Campaign Plan</h3>
              </div>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August 2026 Admissions & Fee Collection Drive"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this incentive campaign..."
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Period Type
                  </label>
                  <select
                    value={planPeriod}
                    onChange={(e) => setPlanPeriod(e.target.value as TargetPeriod)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={planEndDate}
                  onChange={(e) => setPlanEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT TARGET WITH INCENTIVE RULE BUILDER ─── */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 text-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <TargetIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">
                  {editingTarget ? "Edit Target & Incentive Rules" : "Assign Measurable Target"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTargetModal(false);
                  resetTargetForm();
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTargetSubmit} className="space-y-4 text-sm">
              {/* Section 1: Basic Target Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Admissions Target - South Campus"
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Campaign Plan (Optional)
                  </label>
                  <select
                    value={targetPlanId}
                    onChange={(e) => setTargetPlanId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">No Campaign (Independent)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assign To Counselor
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Entire Branch Team Goal</option>
                    {counselors.map((c: any) => (
                      <option key={c.id || c.userId} value={c.id || c.userId}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Metric *
                  </label>
                  <select
                    value={targetMetric}
                    onChange={(e) => {
                      const m = e.target.value as TargetMetric;
                      setTargetMetric(m);
                      if (m === "ADMISSION_REVENUE" || m === "FEE_COLLECTION") {
                        setTargetUnit("INR");
                        setTargetValue(500000);
                      } else {
                        setTargetUnit("COUNT");
                        setTargetValue(20);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="ADMISSIONS">Admissions (Confirmed Count)</option>
                    <option value="ADMISSION_REVENUE">Admission Revenue (INR Collected)</option>
                    <option value="LEADS_CREATED">Leads Generated (Count)</option>
                    <option value="LEADS_CONTACTED">Leads Contacted (Count)</option>
                    <option value="FOLLOW_UPS">Completed Follow-ups</option>
                    <option value="COUNSELLING_SESSIONS">Counselling Sessions (Meetings)</option>
                    <option value="QUALIFIED_LEADS">Qualified Leads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Value ({targetUnit}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetStartDate}
                    onChange={(e) => setTargetStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Section 2: Incentive Rule Configuration */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-white text-sm">
                      Configure Incentive Reward Rules
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableIncentive}
                      onChange={(e) => setEnableIncentive(e.target.checked)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    Enable Incentive
                  </label>
                </div>

                {enableIncentive && (
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        Incentive Calculation Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["SLAB", "PERCENTAGE", "FIXED"] as IncentiveType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setIncentiveType(t)}
                            className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer border ${
                              incentiveType === t
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            {t === "SLAB"
                              ? "📊 Tiered Slabs"
                              : t === "PERCENTAGE"
                              ? "📈 % of Revenue"
                              : "💰 Fixed Reward"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* FIXED REWARD BUILDER */}
                    {incentiveType === "FIXED" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                          Fixed Incentive Amount (₹ upon 100%+ completion)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={fixedAmount}
                          onChange={(e) => setFixedAmount(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {/* SLAB TIER BUILDER */}
                    {incentiveType === "SLAB" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                          <span>Achievement Slab Bracket (%)</span>
                          <span>Incentive Amount (₹)</span>
                        </div>
                        {slabs.map((slab, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={slab.minPercent}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx].minPercent = Number(e.target.value);
                                setSlabs(newSlabs);
                              }}
                              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white text-center"
                            />
                            <span className="text-slate-500 text-xs">to</span>
                            <input
                              type="number"
                              min={0}
                              value={slab.maxPercent}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx].maxPercent = Number(e.target.value);
                                setSlabs(newSlabs);
                              }}
                              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white text-center"
                            />
                            <span className="text-slate-500 text-xs">% = ₹</span>
                            <input
                              type="number"
                              min={0}
                              value={slab.amount}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx].amount = Number(e.target.value);
                                setSlabs(newSlabs);
                              }}
                              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setSlabs(slabs.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setSlabs([...slabs, { minPercent: 130, maxPercent: 999, amount: 20000 }])
                          }
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-1"
                        >
                          + Add Slab Bracket
                        </button>
                      </div>
                    )}

                    {/* PERCENTAGE TIER BUILDER */}
                    {incentiveType === "PERCENTAGE" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                          <span>Achievement Tier (%)</span>
                          <span>Commission Rate (% of Revenue)</span>
                        </div>
                        {percentages.map((pct, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={pct.minPercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].minPercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white text-center"
                            />
                            <span className="text-slate-500 text-xs">to</span>
                            <input
                              type="number"
                              min={0}
                              value={pct.maxPercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].maxPercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white text-center"
                            />
                            <span className="text-slate-500 text-xs">% = </span>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={pct.ratePercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].ratePercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                            />
                            <span className="text-xs text-slate-400">%</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPercentages(percentages.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setPercentages([
                              ...percentages,
                              { minPercent: 130, maxPercent: 999, ratePercent: 2.0 },
                            ])
                          }
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-1"
                        >
                          + Add Commission Tier
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetModal(false);
                    resetTargetForm();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {createTargetMutation.isPending || updateTargetMutation.isPending
                    ? "Saving..."
                    : editingTarget
                    ? "Update Target"
                    : "Assign Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
