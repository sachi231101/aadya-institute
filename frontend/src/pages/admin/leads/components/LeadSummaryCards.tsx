import { cn } from "@/utils";
import { MetricGrid, METRIC_GRID_COLUMNS } from "@/components/layout";
import type { LeadDashboardSummary } from "@/services/leads.api";

export type LeadKpiKey = "total" | "hot" | "unassigned" | "overdue";

interface LeadSummaryCardsProps {
  summary?: LeadDashboardSummary | null;
  activeKey?: LeadKpiKey | null;
  onSelect: (key: LeadKpiKey) => void;
  isLoading?: boolean;
}

/** Cap at 4 actionable KPIs — number + label only (quiet summary row). */
const CARDS: Array<{
  key: LeadKpiKey;
  label: string;
  getValue: (s: LeadDashboardSummary) => number;
}> = [
  {
    key: "total",
    label: "Total",
    getValue: (s) => s.totalLeads,
  },
  {
    key: "hot",
    label: "Hot",
    getValue: (s) => s.hot,
  },
  {
    key: "overdue",
    label: "Overdue",
    getValue: (s) => s.overdueFollowUps,
  },
  {
    key: "unassigned",
    label: "Unassigned",
    getValue: (s) => s.unassigned,
  },
]

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
              "rounded-md border border-border/70 bg-card/50 px-3 py-1.5 text-left transition-colors cursor-pointer hover:bg-muted/40",
              isActive && "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
            )}
          >
            <span className="text-[11px] font-medium text-muted-foreground truncate block leading-none">
              {label}
            </span>
            <p className="text-base font-semibold tracking-tight text-foreground mt-1 tabular-nums leading-none">
              {isLoading ? "—" : value}
            </p>
          </button>
        );
      })}
    </MetricGrid>
  );
}
