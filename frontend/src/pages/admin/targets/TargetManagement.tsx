import React, { useState } from "react";
import {
  Target as TargetIcon,
  Plus,
  Search,
  Award,
  RefreshCw,
  Edit2,
  Trash2,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useTargets,
  useCreateTargetPlan,
  useCreateTarget,
  useUpdateTarget,
  useBulkUpdatePlanTargets,
  useDeleteTarget,
  useRecalculateTarget,
} from "../../../hooks/useTargets";
import { useUsers } from "../../../hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "../../../store/auth.store";
import type {
  Target,
  TargetPeriod,
  TargetMetric,
  IncentiveType,
  IncentiveSlab,
  IncentivePercentageTier,
} from "../../../types/target.types";
import { getTargetMetricLabel } from "../../../types/target.types";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/layout";

function defaultMonthEndDate(): string {
  return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
}

function computeEndDateForPeriod(period: TargetPeriod, startDateStr: string): string {
  const start = new Date(`${startDateStr}T00:00:00`);
  if (period === "DAILY") return startDateStr;
  if (period === "WEEKLY") {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split("T")[0];
  }
  if (period === "MONTHLY") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().split("T")[0];
  }
  if (period === "QUARTERLY") {
    const q = Math.floor(start.getMonth() / 3);
    return new Date(start.getFullYear(), (q + 1) * 3, 0).toISOString().split("T")[0];
  }
  if (period === "YEARLY") {
    return new Date(start.getFullYear(), 11, 31).toISOString().split("T")[0];
  }
  return startDateStr;
}

function addDaysToDateStr(startDateStr: string, daysToAdd: number): string {
  const d = new Date(`${startDateStr}T00:00:00`);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split("T")[0];
}

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Strip day suffix / "(N days)" plan suffix to recover the editable base title. */
function seriesBaseTitle(t: Target): string {
  const fromDay = t.title.replace(/\s—\s.*$/, "").trim();
  const fromPlan = t.targetPlan?.name?.replace(/\s*\(\d+\s*days\)\s*$/i, "").trim();
  return fromDay || fromPlan || t.title;
}

const MAX_DAILY_SERIES_DAYS = 90;

function statusBadgeClass(status: string): string {
  if (status === "ACTIVE") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
  }
  if (status === "UPCOMING") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30";
  }
  if (status === "COMPLETED") {
    return "bg-muted text-muted-foreground border border-border";
  }
  if (status === "LOCKED") {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30";
  }
  return "bg-muted text-muted-foreground border border-border";
}

/** Default incentive slabs in absolute numbers based on the daily/period target value. */
function buildDefaultValueSlabs(targetValue: number): IncentiveSlab[] {
  const t = Math.max(1, Number(targetValue) || 1);
  return [
    { minValue: 0, maxValue: Math.max(0, t - 1), amount: 0 },
    { minValue: t, maxValue: Math.round(t * 1.24), amount: 500 },
    { minValue: Math.round(t * 1.25), maxValue: Math.round(t * 1.49), amount: 1000 },
    { minValue: Math.round(t * 1.5), maxValue: 999999999, amount: 2000 },
  ];
}

function normalizeSlabsToValues(
  slabs: IncentiveSlab[],
  targetValue: number
): IncentiveSlab[] {
  const t = Math.max(1, Number(targetValue) || 1);
  return slabs.map((s) => {
    if (s.minValue !== undefined && s.maxValue !== undefined) {
      return {
        minValue: Number(s.minValue),
        maxValue: Number(s.maxValue),
        amount: Number(s.amount),
      };
    }
    return {
      minValue: Math.round(((s.minPercent ?? 0) / 100) * t),
      maxValue: Math.round(((s.maxPercent ?? 0) / 100) * t),
      amount: Number(s.amount),
    };
  });
}

export const TargetManagement: React.FC = () => {
  const { user } = useAuthStore();
  const isCounselor =
    user?.roles?.includes("COUNSELLOR") &&
    !user?.roles?.includes("ADMIN") &&
    !user?.roles?.includes("CENTER_MANAGER");
  const isAdmin = !!user?.roles?.includes("ADMIN");
  const isCenterManager = !!user?.roles?.includes("CENTER_MANAGER") && !isAdmin;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [metricFilter, setMetricFilter] = useState<string>("ALL");

  // Form State: Target (declared early so counsellor list can filter by branch)
  const [targetTitle, setTargetTitle] = useState("");
  const [targetPeriod, setTargetPeriod] = useState<TargetPeriod>("MONTHLY");
  const [targetBranchId, setTargetBranchId] = useState(
    isCenterManager && user?.branchId ? user.branchId : ""
  );
  const [targetUserId, setTargetUserId] = useState("");
  const [targetMetric, setTargetMetric] = useState<TargetMetric>("ADMISSIONS");
  const [targetValue, setTargetValue] = useState<number>(20);
  const [targetUnit, setTargetUnit] = useState("COUNT");
  const [targetStartDate, setTargetStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [targetEndDate, setTargetEndDate] = useState(defaultMonthEndDate());
  /** When Period = Daily: create this many one-day targets (e.g. 15 × ₹3000/day). */
  const [dailyDayCount, setDailyDayCount] = useState(1);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);

  // API Hooks — counsellor list includes own targets + branch team goals (backend OR)
  const { data: targetsData, isLoading: targetsLoading } = useTargets({
    search: search || undefined,
    status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
    metric: metricFilter !== "ALL" ? (metricFilter as any) : undefined,
    limit: 200,
  });
  const { data: branchesResponse } = useBranches({ limit: 100, status: "ACTIVE" });
  const counsellorBranchFilter =
    targetBranchId || (isCenterManager ? user?.branchId || undefined : undefined);
  const { data: usersData } = useUsers({
    role: "COUNSELLOR",
    limit: 100,
    status: "ACTIVE",
    branchId: counsellorBranchFilter,
  });

  // Mutations
  const createPlanMutation = useCreateTargetPlan();
  const createTargetMutation = useCreateTarget();
  const updateTargetMutation = useUpdateTarget();
  const bulkUpdateSeriesMutation = useBulkUpdatePlanTargets();
  const deleteTargetMutation = useDeleteTarget();
  const recalculateMutation = useRecalculateTarget();

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Modals
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  /** When set, form applies changes to every day in this plan series. */
  const [editingSeriesPlanId, setEditingSeriesPlanId] = useState<string | null>(null);
  const [editingSeriesDayCount, setEditingSeriesDayCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<Record<string, boolean>>({});

  // Form State: Incentive Rule Builder
  const [enableIncentive, setEnableIncentive] = useState(true);
  const [incentiveType, setIncentiveType] = useState<IncentiveType>("FIXED");
  const [fixedAmount, setFixedAmount] = useState<number>(500);
  const [slabs, setSlabs] = useState<IncentiveSlab[]>(() => buildDefaultValueSlabs(20));
  const [percentages, setPercentages] = useState<IncentivePercentageTier[]>([
    { minPercent: 0, maxPercent: 79, ratePercent: 0 },
    { minPercent: 80, maxPercent: 99, ratePercent: 0.5 },
    { minPercent: 100, maxPercent: 109, ratePercent: 1.0 },
    { minPercent: 110, maxPercent: 124, ratePercent: 1.25 },
    { minPercent: 125, maxPercent: 999, ratePercent: 1.5 },
  ]);

  const resetTargetForm = () => {
    setEditingTarget(null);
    setEditingSeriesPlanId(null);
    setEditingSeriesDayCount(0);
    setTargetTitle("");
    setTargetPeriod("MONTHLY");
    setTargetBranchId(isCenterManager && user?.branchId ? user.branchId : "");
    setTargetUserId("");
    setTargetMetric("ADMISSIONS");
    setTargetValue(20);
    setTargetUnit("COUNT");
    const today = new Date().toISOString().split("T")[0];
    setTargetStartDate(today);
    setTargetEndDate(defaultMonthEndDate());
    setDailyDayCount(1);
    setEnableIncentive(true);
    setIncentiveType("FIXED");
    setFixedAmount(500);
    setSlabs(buildDefaultValueSlabs(20));
  };

  const handlePeriodChange = (next: TargetPeriod) => {
    setTargetPeriod(next);
    if (next === "DAILY") {
      setTargetEndDate(targetStartDate);
      setDailyDayCount(1);
    } else {
      setDailyDayCount(1);
      if (next !== "CUSTOM") {
        setTargetEndDate(computeEndDateForPeriod(next, targetStartDate));
      }
    }
  };

  const handleStartDateChange = (next: string) => {
    setTargetStartDate(next);
    if (targetPeriod === "DAILY") {
      setTargetEndDate(
        dailyDayCount > 1 ? addDaysToDateStr(next, dailyDayCount - 1) : next
      );
    }
  };

  const dailySeriesEndDate =
    targetPeriod === "DAILY" && dailyDayCount > 1
      ? addDaysToDateStr(targetStartDate, dailyDayCount - 1)
      : targetStartDate;

  const applyIncentiveFormFromTarget = (t: Target) => {
    if (t.incentiveRule) {
      setEnableIncentive(true);
      setIncentiveType(t.incentiveRule.incentiveType);
      if (t.incentiveRule.fixedAmount) {
        setFixedAmount(Number(t.incentiveRule.fixedAmount));
      }
      if (t.incentiveRule.slabs) {
        setSlabs(normalizeSlabsToValues(t.incentiveRule.slabs, Number(t.targetValue)));
      }
      if (t.incentiveRule.percentages) {
        setPercentages(t.incentiveRule.percentages);
      }
    } else {
      setEnableIncentive(false);
    }
  };

  const handleOpenEditTarget = (t: Target) => {
    setEditingSeriesPlanId(null);
    setEditingSeriesDayCount(0);
    setEditingTarget(t);
    setTargetTitle(t.title);
    setTargetPeriod(t.targetPlan?.periodType ?? "CUSTOM");
    setTargetBranchId(t.branchId || "");
    setTargetUserId(t.userId || "");
    setTargetMetric(t.metric);
    setTargetValue(Number(t.targetValue));
    setTargetUnit(t.unit);
    setTargetStartDate(new Date(t.startDate).toISOString().split("T")[0]);
    setTargetEndDate(new Date(t.endDate).toISOString().split("T")[0]);
    applyIncentiveFormFromTarget(t);
    setShowTargetModal(true);
  };

  const handleOpenEditSeries = (items: Target[]) => {
    const first = items[0];
    if (!first?.targetPlanId) return;
    setEditingTarget(null);
    setEditingSeriesPlanId(first.targetPlanId);
    setEditingSeriesDayCount(items.length);
    setTargetTitle(seriesBaseTitle(first));
    setTargetPeriod("DAILY");
    setTargetBranchId(first.branchId || "");
    setTargetUserId(first.userId || "");
    setTargetMetric(first.metric);
    setTargetValue(Number(first.targetValue));
    setTargetUnit(first.unit);
    const sorted = [...items].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    setTargetStartDate(new Date(sorted[0].startDate).toISOString().split("T")[0]);
    setTargetEndDate(
      new Date(sorted[sorted.length - 1].endDate).toISOString().split("T")[0]
    );
    setDailyDayCount(items.length);
    applyIncentiveFormFromTarget(first);
    setShowTargetModal(true);
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

    const resolvedBranchId =
      (isCenterManager ? user?.branchId : targetBranchId) || undefined;
    if (!resolvedBranchId) {
      alert("Please select a branch");
      return;
    }

    const ruleInput = enableIncentive
      ? incentiveType === "FIXED"
        ? {
            incentiveType: "FIXED" as const,
            fixedAmount: Math.max(0, fixedAmount),
          }
        : incentiveType === "SLAB"
        ? {
            incentiveType: "SLAB" as const,
            slabs:
              slabs.length > 0
                ? slabs.map((s) => ({
                    minValue: Number(s.minValue ?? 0),
                    maxValue: Number(s.maxValue ?? 0),
                    amount: Number(s.amount ?? 0),
                  }))
                : buildDefaultValueSlabs(targetValue),
          }
        : {
            incentiveType: "PERCENTAGE" as const,
            percentages,
          }
      : null;

    if (enableIncentive && !ruleInput) {
      alert("Enable Incentive is on — please set a Fixed reward amount or slab rules.");
      return;
    }
    if (enableIncentive && incentiveType === "FIXED" && fixedAmount <= 0) {
      alert("Enter a Fixed reward amount (₹) greater than 0, or turn off Enable Incentive.");
      return;
    }

    try {
      if (editingSeriesPlanId) {
        await bulkUpdateSeriesMutation.mutateAsync({
          planId: editingSeriesPlanId,
          data: {
            title: targetTitle.trim(),
            userId: targetUserId || null,
            targetType: targetUserId ? "INDIVIDUAL" : "BRANCH",
            metric: targetMetric,
            targetValue,
            unit: targetUnit,
            incentiveRule: ruleInput,
          },
        });
        showToast(
          `✓ Updated all ${editingSeriesDayCount} days in this series${
            !targetUserId ? " (visible to branch counsellors & center manager)" : ""
          }`
        );
      } else if (editingTarget) {
        const endDate =
          targetPeriod === "DAILY" ? targetStartDate : targetEndDate;
        await updateTargetMutation.mutateAsync({
          id: editingTarget.id,
          data: {
            title: targetTitle.trim(),
            branchId: resolvedBranchId,
            userId: targetUserId || null,
            targetType: targetUserId ? "INDIVIDUAL" : "BRANCH",
            metric: targetMetric,
            targetValue,
            unit: targetUnit,
            startDate: targetStartDate,
            endDate,
            incentiveRule: ruleInput,
          },
        });
        showToast("✓ Target updated and progress recalculated!");
      } else {
        const isDailySeries = targetPeriod === "DAILY" && dailyDayCount > 1;
        if (isDailySeries) {
          if (dailyDayCount < 2 || dailyDayCount > MAX_DAILY_SERIES_DAYS) {
            alert(`Number of days must be between 2 and ${MAX_DAILY_SERIES_DAYS}`);
            return;
          }
          setIsCreatingSeries(true);
          try {
            const seriesEnd = addDaysToDateStr(targetStartDate, dailyDayCount - 1);
            const planRes = await createPlanMutation.mutateAsync({
              name: `${targetTitle.trim()} (${dailyDayCount} days)`,
              description: `Daily series: ${targetValue} ${targetUnit}/day · ${formatDayLabel(targetStartDate)} – ${formatDayLabel(seriesEnd)}`,
              branchId: resolvedBranchId,
              periodType: "CUSTOM",
              startDate: targetStartDate,
              endDate: seriesEnd,
            });

            for (let i = 0; i < dailyDayCount; i++) {
              const dayDate = addDaysToDateStr(targetStartDate, i);
              await createTargetMutation.mutateAsync({
                title: `${targetTitle.trim()} — ${formatDayLabel(dayDate)}`,
                branchId: resolvedBranchId,
                targetPlanId: planRes.data.id,
                userId: targetUserId || undefined,
                targetType: targetUserId ? "INDIVIDUAL" : "BRANCH",
                metric: targetMetric,
                targetValue,
                unit: targetUnit,
                startDate: dayDate,
                endDate: dayDate,
                incentiveRule: ruleInput || undefined,
              });
            }
            showToast(
              `✓ Created ${dailyDayCount}-day series${
                !targetUserId
                  ? " — Entire Branch Team Goal (counsellors & center manager)"
                  : ""
              }`
            );
          } finally {
            setIsCreatingSeries(false);
          }
        } else {
          const endDate =
            targetPeriod === "DAILY" ? targetStartDate : targetEndDate;
          const planRes = await createPlanMutation.mutateAsync({
            name: targetTitle.trim(),
            branchId: resolvedBranchId,
            periodType: targetPeriod,
            startDate: targetStartDate,
            endDate,
          });
          await createTargetMutation.mutateAsync({
            title: targetTitle.trim(),
            branchId: resolvedBranchId,
            targetPlanId: planRes.data.id,
            userId: targetUserId || undefined,
            targetType: targetUserId ? "INDIVIDUAL" : "BRANCH",
            metric: targetMetric,
            targetValue,
            unit: targetUnit,
            startDate: targetStartDate,
            endDate,
            incentiveRule: ruleInput || undefined,
          });
          showToast("✓ Target created successfully!");
        }
      }

      setShowTargetModal(false);
      resetTargetForm();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save target");
    }
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    try {
      await deleteTargetMutation.mutateAsync(id);
      setDeleteTarget(null);
      showToast(`✓ Target "${title}" deleted`);
    } catch {
      showToast("❌ Failed to delete target");
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
  const branches = branchesResponse?.data || [];
  const counselors = (usersData?.data || []).filter((u) =>
    Array.isArray(u.roles) ? u.roles.includes("COUNSELLOR") : false
  );

  type TargetRow =
    | { kind: "single"; target: Target }
    | { kind: "series"; key: string; planName: string; items: Target[] };

  /** Group multi-day plan targets into one summary row for admin/manager clarity. */
  const displayRows: TargetRow[] = (() => {
    const byPlan = new Map<string, Target[]>();
    const singles: Target[] = [];

    for (const t of targets) {
      if (t.targetPlanId) {
        const list = byPlan.get(t.targetPlanId) || [];
        list.push(t);
        byPlan.set(t.targetPlanId, list);
      } else {
        singles.push(t);
      }
    }

    const rows: TargetRow[] = [];
    for (const [planId, items] of byPlan.entries()) {
      items.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      if (items.length >= 2) {
        rows.push({
          kind: "series",
          key: planId,
          planName: items[0].targetPlan?.name || items[0].title.replace(/\s—\s.*$/, ""),
          items,
        });
      } else {
        singles.push(...items);
      }
    }

    for (const t of singles) {
      rows.push({ kind: "single", target: t });
    }

    rows.sort((a, b) => {
      const aDate =
        a.kind === "series"
          ? a.items[0]?.startDate
          : a.target.startDate;
      const bDate =
        b.kind === "series"
          ? b.items[0]?.startDate
          : b.target.startDate;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return rows;
  })();

  const toggleSeries = (key: string) => {
    setExpandedSeriesIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTargetCells = (t: Target, opts?: { nested?: boolean }) => {
    const p = t.targetProgress?.[0];
    const targetVal = Number(t.targetValue);
    const achievedVal = p ? Number(p.achievedValue) : 0;
    const percentage = p ? Number(p.achievementPercentage) : 0;
    const potentialIncentive = p ? Number(p.potentialIncentive) : 0;
    const nested = opts?.nested;

    return (
      <>
        <td className={`py-4 px-4 ${nested ? "pl-10" : ""}`}>
          <div className="font-semibold text-foreground text-sm">{t.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {!nested && <span>{t.targetPlan?.name || "Independent"}</span>}
            {!nested && <span>•</span>}
            <span>
              {new Date(t.startDate).toLocaleDateString()} -{" "}
              {new Date(t.endDate).toLocaleDateString()}
            </span>
          </div>
        </td>

        <td className="py-4 px-4">
          {t.user ? (
            <div>
              <div className="font-semibold text-foreground">{t.user.name}</div>
              <div className="text-xs text-muted-foreground">{t.branch?.name || "All Branches"}</div>
            </div>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
              Branch Team Goal
            </span>
          )}
        </td>

        <td className="py-4 px-4">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
            {getTargetMetricLabel(t.metric)}
          </span>
        </td>

        <td className="py-4 px-4">
          <div className="text-xs">
            <span className="text-muted-foreground">Target: </span>
            <strong className="text-foreground font-bold">
              {t.unit === "INR" ? formatCurrency(targetVal) : targetVal.toLocaleString()}
            </strong>
          </div>
          <div className="text-xs mt-0.5">
            <span className="text-muted-foreground">Achieved: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {t.unit === "INR" ? formatCurrency(achievedVal) : achievedVal.toLocaleString()}
            </strong>
          </div>
        </td>

        <td className="py-4 px-4">
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span
                className={
                  percentage >= 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : percentage >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {percentage}%
              </span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
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
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {t.incentiveRule.incentiveType === "FIXED"
                  ? `Fixed ₹${Number(t.incentiveRule.fixedAmount || 0).toLocaleString()}`
                  : t.incentiveRule.incentiveType}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {potentialIncentive > 0
                  ? `Earned: ${formatCurrency(potentialIncentive)}`
                  : "Reward if target met"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No reward rule</span>
          )}
        </td>

        <td className="py-4 px-4">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusBadgeClass(t.status)}`}>
            {t.status}
          </span>
        </td>

        <td className="py-4 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              title="Recalculate live progress from database"
              onClick={() => handleRecalculate(t.id)}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <PermissionGate itemKey="targets.all" mode="write">
              {t.status !== "LOCKED" && (
                <>
                  <button
                    title="Edit target"
                    onClick={() => handleOpenEditTarget(t)}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete target"
                    onClick={() => handleDelete(t.id, t.title)}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </PermissionGate>
          </div>
        </td>
      </>
    );
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
        title={isCounselor ? "My Targets & Goals" : "Target & Incentive Management"}
        description={
          isCounselor
            ? "Track your assigned admission, revenue, and lead conversion targets, live database progress, and potential incentive rewards."
            : "Create counsellor targets with period, metrics, and incentive rules in one place."
        }
        actions={
          <PermissionGate itemKey="targets.all" mode="write">
            <button
              onClick={() => {
                resetTargetForm();
                setShowTargetModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Target
            </button>
          </PermissionGate>
        }
      />

      {/* Counselor KPI Summary Cards */}
      {isCounselor && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Active Goals
            </span>
            <div className="text-3xl font-bold text-foreground">
              {targets.filter((t) => t.status === "ACTIVE").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assigned for current period</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Average Progress
            </span>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {targets.length
                ? Math.round(
                    targets.reduce((sum, t) => {
                      const p = t.targetProgress?.[0];
                      return sum + Number(p?.achievementPercentage || 0);
                    }, 0) / targets.length
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall goal achievement</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Potential Reward
            </span>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(
                targets.reduce((sum, t) => {
                  const p = t.targetProgress?.[0];
                  return sum + Number(p?.potentialIncentive || 0);
                }, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Live calculated incentive</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search targets by title or counselor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={metricFilter}
                onChange={(e) => setMetricFilter(e.target.value)}
                className="px-3.5 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Metrics</option>
                <option value="ADMISSIONS">No of Admission</option>
                <option value="ADMISSION_REVENUE">Total New Fees</option>
                <option value="FEE_COLLECTION">Total Due Collection</option>
                <option value="LEADS_CREATED">Leads Created</option>
                <option value="FOLLOW_UPS">Follow Ups</option>
                <option value="COUNSELLING_SESSIONS">Counselling Sessions</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
                <option value="LOCKED">Locked</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          {/* Targets Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {targetsLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-400 mb-3" />
                <p>Loading assigned targets...</p>
              </div>
            ) : targets.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <TargetIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground mb-1">
                  {isCounselor ? "No Active Targets Assigned" : "No Targets Found"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {isCounselor
                    ? "You do not have any active targets assigned for this period. Contact your branch manager or administrator."
                    : "No assigned targets match your search criteria. Click \"Create Target\" to create one."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-muted-foreground">
                  <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-4 px-4">Target Title & Plan</th>
                      <th className="py-4 px-4">{isCounselor ? "Target Scope" : "Assigned Counselor"}</th>
                      <th className="py-4 px-4">Metric</th>
                      <th className="py-4 px-4">Target vs Achieved</th>
                      <th className="py-4 px-4">Progress %</th>
                      <th className="py-4 px-4">Incentive Rule</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayRows.map((row) => {
                      if (row.kind === "single") {
                        return (
                          <tr key={row.target.id} className="hover:bg-muted/40 transition">
                            {renderTargetCells(row.target)}
                          </tr>
                        );
                      }

                      const { items, key, planName } = row;
                      const expanded = !!expandedSeriesIds[key];
                      const first = items[0];
                      const dayCount = items.length;
                      const dailyTarget = Number(first.targetValue);
                      const unit = first.unit;
                      const totalTarget = items.reduce((s, t) => s + Number(t.targetValue), 0);
                      const totalAchieved = items.reduce(
                        (s, t) => s + Number(t.targetProgress?.[0]?.achievedValue || 0),
                        0
                      );
                      const totalIncentive = items.reduce(
                        (s, t) => s + Number(t.targetProgress?.[0]?.potentialIncentive || 0),
                        0
                      );
                      const daysHit = items.filter(
                        (t) => Number(t.targetProgress?.[0]?.achievementPercentage || 0) >= 100
                      ).length;
                      const avgPct =
                        dayCount > 0
                          ? Math.round(
                              (items.reduce(
                                (s, t) =>
                                  s + Number(t.targetProgress?.[0]?.achievementPercentage || 0),
                                0
                              ) /
                                dayCount) *
                                100
                            ) / 100
                          : 0;
                      const rangeStart = new Date(items[0].startDate).toLocaleDateString();
                      const rangeEnd = new Date(items[items.length - 1].endDate).toLocaleDateString();
                      const activeCount = items.filter((t) => t.status === "ACTIVE").length;
                      const upcomingCount = items.filter((t) => t.status === "UPCOMING").length;
                      const completedCount = items.filter((t) => t.status === "COMPLETED").length;

                      return (
                        <React.Fragment key={key}>
                          <tr className="hover:bg-muted/40 transition bg-indigo-50/40 dark:bg-indigo-950/20">
                            <td className="py-4 px-4">
                              <button
                                type="button"
                                onClick={() => toggleSeries(key)}
                                className="flex items-start gap-2 text-left w-full cursor-pointer"
                              >
                                <span className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {expanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </span>
                                <span>
                                  <span className="font-semibold text-foreground text-sm block">
                                    {planName}
                                  </span>
                                  <span className="text-xs text-muted-foreground mt-0.5 block">
                                    {dayCount} daily targets · {rangeStart} – {rangeEnd}
                                    {unit === "INR"
                                      ? ` · ${formatCurrency(dailyTarget)}/day`
                                      : ` · ${dailyTarget.toLocaleString()} ${unit}/day`}
                                  </span>
                                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 block">
                                    {expanded ? "Hide day-wise details" : "Click to view all days"}
                                  </span>
                                </span>
                              </button>
                            </td>

                            <td className="py-4 px-4">
                              {first.user ? (
                                <div>
                                  <div className="font-semibold text-foreground">{first.user.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {first.branch?.name || "All Branches"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  Branch Team Goal
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                {getTargetMetricLabel(first.metric)}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="text-xs">
                                <span className="text-muted-foreground">Total target: </span>
                                <strong className="text-foreground font-bold">
                                  {unit === "INR"
                                    ? formatCurrency(totalTarget)
                                    : totalTarget.toLocaleString()}
                                </strong>
                              </div>
                              <div className="text-xs mt-0.5">
                                <span className="text-muted-foreground">Total achieved: </span>
                                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {unit === "INR"
                                    ? formatCurrency(totalAchieved)
                                    : totalAchieved.toLocaleString()}
                                </strong>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                Days hit target: {daysHit}/{dayCount}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="w-28 space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span
                                    className={
                                      avgPct >= 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : avgPct >= 70
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }
                                  >
                                    {avgPct}% avg
                                  </span>
                                </div>
                                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      avgPct >= 100
                                        ? "bg-emerald-500"
                                        : avgPct >= 70
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                    }`}
                                    style={{ width: `${Math.min(avgPct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {first.incentiveRule ? (
                                <div className="text-xs">
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {first.incentiveRule.incentiveType === "FIXED"
                                      ? `Fixed ₹${Number(first.incentiveRule.fixedAmount || 0).toLocaleString()}/day`
                                      : first.incentiveRule.incentiveType}
                                  </span>
                                  <span className="block text-[11px] text-muted-foreground">
                                    {totalIncentive > 0
                                      ? `Potential: ${formatCurrency(totalIncentive)}`
                                      : "Reward if each day target met"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No reward rule</span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                {activeCount > 0 && (
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full w-fit ${statusBadgeClass("ACTIVE")}`}>
                                    {activeCount} active
                                  </span>
                                )}
                                {upcomingCount > 0 && (
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full w-fit ${statusBadgeClass("UPCOMING")}`}>
                                    {upcomingCount} upcoming
                                  </span>
                                )}
                                {completedCount > 0 && (
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full w-fit ${statusBadgeClass("COMPLETED")}`}>
                                    {completedCount} completed
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <PermissionGate itemKey="targets.all" mode="write">
                                  <button
                                    type="button"
                                    title="Edit entire series"
                                    onClick={() => handleOpenEditSeries(items)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit series
                                  </button>
                                </PermissionGate>
                                <button
                                  type="button"
                                  onClick={() => toggleSeries(key)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                                >
                                  {expanded ? "Collapse" : "View days"}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {expanded &&
                            items.map((t) => (
                              <tr
                                key={t.id}
                                className="hover:bg-muted/30 transition bg-muted/20"
                              >
                                {renderTargetCells(t, { nested: true })}
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* ─── MODAL: CREATE / EDIT TARGET WITH INCENTIVE RULE BUILDER ─── */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-5 text-foreground my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <TargetIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">
                  {editingSeriesPlanId
                    ? `Edit Series (${editingSeriesDayCount} days)`
                    : editingTarget
                    ? "Edit Target"
                    : "Create Target"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTargetModal(false);
                  resetTargetForm();
                }}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTargetSubmit} className="space-y-4 text-sm">
              {/* Section 1: Basic Target Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monthly Admissions Target - South Campus"
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Branch *
                  </label>
                  <select
                    required
                    value={targetBranchId}
                    onChange={(e) => {
                      setTargetBranchId(e.target.value);
                      setTargetUserId("");
                    }}
                    disabled={isCenterManager || !!editingTarget || !!editingSeriesPlanId}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.code ? ` (${b.code})` : ""}
                      </option>
                    ))}
                  </select>
                  {isCenterManager && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Branch is fixed to your assigned center.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Period Type
                  </label>
                  <select
                    value={targetPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value as TargetPeriod)}
                    disabled={!!editingTarget || !!editingSeriesPlanId}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  {(editingTarget || editingSeriesPlanId) && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {editingSeriesPlanId
                        ? "Dates stay per day — this updates title, assignee, metric, value & reward on all days."
                        : "Period is tied to the existing plan and cannot be changed here."}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Assign To Counselor
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    disabled={!targetBranchId && !isCenterManager}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Entire Branch Team Goal</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                  {!targetUserId && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Visible to center managers and counsellors in this branch — not faculty or students.
                    </p>
                  )}
                  {!targetBranchId && isAdmin && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Select a branch to load counsellors.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
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
                        setSlabs(buildDefaultValueSlabs(500000));
                      } else {
                        setTargetUnit("COUNT");
                        setTargetValue(20);
                        setSlabs(buildDefaultValueSlabs(20));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="ADMISSIONS">No of Admission (Count)</option>
                    <option value="ADMISSION_REVENUE">Total New Fees (INR)</option>
                    <option value="FEE_COLLECTION">Total Due Collection — Overdue Only (INR)</option>
                    <option value="LEADS_CREATED">Leads Generated (Count)</option>
                    <option value="LEADS_CONTACTED">Leads Contacted (Count)</option>
                    <option value="FOLLOW_UPS">Completed Follow-ups</option>
                    <option value="COUNSELLING_SESSIONS">Counselling Sessions (Meetings)</option>
                    <option value="QUALIFIED_LEADS">Qualified Leads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {targetPeriod === "DAILY" ? `Daily Target Value (${targetUnit}) *` : `Target Value (${targetUnit}) *`}
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={targetValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setTargetValue(next);
                      if (!editingTarget && incentiveType === "SLAB") {
                        setSlabs(buildDefaultValueSlabs(next));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    disabled={!!editingSeriesPlanId}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {targetPeriod === "DAILY" && !editingTarget && !editingSeriesPlanId ? (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Number of Days *
                    </label>
                    <Input
                      type="number"
                      required
                      min={1}
                      max={MAX_DAILY_SERIES_DAYS}
                      value={dailyDayCount}
                      onChange={(e) => {
                        const n = Math.max(
                          1,
                          Math.min(MAX_DAILY_SERIES_DAYS, Number(e.target.value) || 1)
                        );
                        setDailyDayCount(n);
                        setTargetEndDate(
                          n > 1 ? addDaysToDateStr(targetStartDate, n - 1) : targetStartDate
                        );
                      }}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {dailyDayCount > 1
                        ? `Creates ${dailyDayCount} daily targets of ${targetValue} ${targetUnit}/day (${formatDayLabel(targetStartDate)} → ${formatDayLabel(dailySeriesEndDate)}). Total: ${targetValue * dailyDayCount} ${targetUnit}.`
                        : "Set more than 1 to auto-create a daily series (e.g. 15 days × ₹3000/day)."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={targetEndDate}
                      onChange={(e) => setTargetEndDate(e.target.value)}
                      disabled={targetPeriod === "DAILY"}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {targetPeriod === "DAILY" && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Daily targets use the same start and end date.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Incentive Rule Configuration */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-foreground text-sm">
                      Incentive Reward
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableIncentive}
                      onChange={(e) => setEnableIncentive(e.target.checked)}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                    />
                    Enable reward
                  </label>
                </div>

                {enableIncentive && (
                  <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-4">
                    <p className="text-[11px] text-muted-foreground">
                      Simple option: use <strong>Fixed Reward</strong> (e.g. ₹500 when the day
                      target is met). Amount Slabs are optional advanced tiers.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Reward type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["FIXED", "SLAB", "PERCENTAGE"] as IncentiveType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setIncentiveType(t)}
                            className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer border ${
                              incentiveType === t
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                                : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {t === "FIXED"
                              ? "Fixed Reward"
                              : t === "SLAB"
                              ? "Amount Slabs"
                              : "% of Revenue"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {incentiveType === "FIXED" && (
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                          Fixed reward amount (₹) when target is met
                        </label>
                        <Input
                          type="number"
                          min={1}
                          required={enableIncentive && incentiveType === "FIXED"}
                          value={fixedAmount}
                          onChange={(e) => setFixedAmount(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}

                    {/* SLAB TIER BUILDER — absolute numbers (collection/count), not % */}
                    {incentiveType === "SLAB" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                          <span>
                            Achieved range ({targetUnit === "INR" ? "₹" : targetUnit})
                          </span>
                          <span>Incentive Amount (₹)</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Example: target {targetUnit === "INR" ? "₹" : ""}
                          {targetValue}
                          {targetUnit === "INR" ? "" : ` ${targetUnit}`} — if they collect{" "}
                          {targetUnit === "INR" ? "₹" : ""}
                          {targetValue}
                          {targetUnit === "INR" ? "" : ` ${targetUnit}`} to more, use the matching
                          row’s bonus.
                        </p>
                        {slabs.map((slab, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={slab.minValue ?? 0}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx] = {
                                  ...newSlabs[idx],
                                  minValue: Number(e.target.value),
                                  maxValue: newSlabs[idx].maxValue ?? 0,
                                  amount: newSlabs[idx].amount,
                                };
                                setSlabs(newSlabs);
                              }}
                              className="w-24 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground text-center"
                            />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input
                              type="number"
                              min={0}
                              value={slab.maxValue ?? 0}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx] = {
                                  ...newSlabs[idx],
                                  minValue: newSlabs[idx].minValue ?? 0,
                                  maxValue: Number(e.target.value),
                                  amount: newSlabs[idx].amount,
                                };
                                setSlabs(newSlabs);
                              }}
                              className="w-28 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground text-center"
                            />
                            <span className="text-muted-foreground text-xs">= ₹</span>
                            <Input
                              type="number"
                              min={0}
                              value={slab.amount}
                              onChange={(e) => {
                                const newSlabs = [...slabs];
                                newSlabs[idx] = {
                                  ...newSlabs[idx],
                                  minValue: newSlabs[idx].minValue ?? 0,
                                  maxValue: newSlabs[idx].maxValue ?? 0,
                                  amount: Number(e.target.value),
                                };
                                setSlabs(newSlabs);
                              }}
                              className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() => setSlabs(slabs.filter((_, i) => i !== idx))}
                              className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const lastMax = slabs[slabs.length - 1]?.maxValue ?? targetValue;
                            setSlabs([
                              ...slabs,
                              {
                                minValue: Number(lastMax) + 1,
                                maxValue: Number(lastMax) + Math.max(1, targetValue),
                                amount: 3000,
                              },
                            ]);
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-1"
                        >
                          + Add Slab Bracket
                        </button>
                      </div>
                    )}

                    {/* PERCENTAGE TIER BUILDER */}
                    {incentiveType === "PERCENTAGE" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                          <span>Achievement Tier (%)</span>
                          <span>Commission Rate (% of Revenue)</span>
                        </div>
                        {percentages.map((pct, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={pct.minPercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].minPercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground text-center"
                            />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input
                              type="number"
                              min={0}
                              value={pct.maxPercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].maxPercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground text-center"
                            />
                            <span className="text-muted-foreground text-xs">% = </span>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={pct.ratePercent}
                              onChange={(e) => {
                                const newPcts = [...percentages];
                                newPcts[idx].ratePercent = Number(e.target.value);
                                setPercentages(newPcts);
                              }}
                              className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPercentages(percentages.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
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
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetModal(false);
                    resetTargetForm();
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border border-border transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreatingSeries ||
                    createPlanMutation.isPending ||
                    createTargetMutation.isPending ||
                    updateTargetMutation.isPending ||
                    bulkUpdateSeriesMutation.isPending
                  }
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSeries ||
                  createPlanMutation.isPending ||
                  createTargetMutation.isPending ||
                  updateTargetMutation.isPending ||
                  bulkUpdateSeriesMutation.isPending
                    ? isCreatingSeries
                      ? `Creating ${dailyDayCount} daily targets...`
                      : "Saving..."
                    : editingSeriesPlanId
                    ? `Update all ${editingSeriesDayCount} days`
                    : editingTarget
                    ? "Save Changes"
                    : targetPeriod === "DAILY" && dailyDayCount > 1
                    ? `Create ${dailyDayCount} Daily Targets`
                    : "Create Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteTargetMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-card text-foreground rounded-xl p-6 border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete target?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
              This will permanently remove{" "}
              <strong className="text-foreground">{deleteTarget?.title}</strong>. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={deleteTargetMutation.isPending}
              onClick={() => setDeleteTarget(null)}
              className="text-xs font-bold rounded-xl border-border bg-card text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteTargetMutation.isPending}
              onClick={handleDeleteConfirm}
              className="text-xs font-bold rounded-xl gap-1.5"
            >
              {deleteTargetMutation.isPending ? "Deleting..." : "Delete target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
