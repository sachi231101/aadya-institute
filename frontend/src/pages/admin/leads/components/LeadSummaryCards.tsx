import { cn } from "@/utils";
import { MetricGrid, METRIC_GRID_COLUMNS } from "@/components/layout";
import type { LeadDashboardSummary } from "@/services/leads.api";

export type LeadKpiKey =
  | "total"
  | "new"
  | "hot"
  | "warm"
  | "cold"
  | "unassigned"
  | "today"
  | "overdue";

interface LeadSummaryCardsProps {
  summary?: LeadDashboardSummary | null;
  activeKey?: LeadKpiKey | null;
  onSelect: (key: LeadKpiKey) => void;
  isLoading?: boolean;
}

/** Cap at 4 actionable KPIs — number + label only (no icon wells). */
const CARDS: Array<{
  key: LeadKpiKey;
  label: string;
  getValue: (s: LeadDashboardSummary) => number;
  accent: string;
}> = [
  {
    key: "total",
    label: "Total",
    getValue: (s) => s.totalLeads,
    accent: "border-slate-200 hover:border-slate-400",
  },
  {
    key: "hot",
    label: "Hot",
    getValue: (s) => s.hot,
    accent: "border-red-200 hover:border-red-400",
  },
  {
    key: "overdue",
    label: "Overdue",
    getValue: (s) => s.overdueFollowUps,
    accent: "border-orange-200 hover:border-orange-400",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    getValue: (s) => s.unassigned,
    accent: "border-violet-200 hover:border-violet-400",
  },
];

export function LeadSummaryCards({
  summary,
  activeKey,
  onSelect,
  isLoading,
}: LeadSummaryCardsProps) {
  return (
    <MetricGrid density="compact" columns={METRIC_GRID_COLUMNS[4]}>
      {CARDS.map(({ key, label, getValue }) => {
        const value = summary ? getValue(summary) : 0;
        const isActive = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            disabled={isLoading}
            className={cn(
              "rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-xs transition-colors cursor-pointer hover:border-primary/40",
              isActive && "ring-2 ring-primary border-primary bg-primary/5"
            )}
          >
            <span className="text-[11px] font-semibold text-muted-foreground truncate block">
              {label}
            </span>
            <p className="text-xl font-semibold tracking-tight text-foreground mt-1">
              {isLoading ? "—" : value}
            </p>
          </button>
        );
      })}
    </MetricGrid>
  );
}
