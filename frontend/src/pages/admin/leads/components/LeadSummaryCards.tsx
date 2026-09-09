import type { ElementType } from "react";
import {
  Flame,
  Snowflake,
  Thermometer,
  Users,
  UserPlus,
  UserX,
  CalendarPlus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/utils";
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

const CARDS: Array<{
  key: LeadKpiKey;
  label: string;
  icon: ElementType;
  getValue: (s: LeadDashboardSummary) => number;
  accent: string;
}> = [
  {
    key: "total",
    label: "Total",
    icon: Users,
    getValue: (s) => s.totalLeads,
    accent: "border-slate-200 hover:border-slate-400",
  },
  {
    key: "new",
    label: "New",
    icon: UserPlus,
    getValue: (s) => s.new,
    accent: "border-blue-200 hover:border-blue-400",
  },
  {
    key: "hot",
    label: "Hot",
    icon: Flame,
    getValue: (s) => s.hot,
    accent: "border-red-200 hover:border-red-400",
  },
  {
    key: "warm",
    label: "Warm",
    icon: Thermometer,
    getValue: (s) => s.warm,
    accent: "border-amber-200 hover:border-amber-400",
  },
  {
    key: "cold",
    label: "Cold",
    icon: Snowflake,
    getValue: (s) => s.cold,
    accent: "border-sky-200 hover:border-sky-400",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    icon: UserX,
    getValue: (s) => s.unassigned,
    accent: "border-violet-200 hover:border-violet-400",
  },
  {
    key: "today",
    label: "Today's",
    icon: CalendarPlus,
    getValue: (s) => s.todayCreated,
    accent: "border-emerald-200 hover:border-emerald-400",
  },
  {
    key: "overdue",
    label: "Overdue Follow-ups",
    icon: AlertTriangle,
    getValue: (s) => s.overdueFollowUps,
    accent: "border-orange-200 hover:border-orange-400",
  },
];

export function LeadSummaryCards({
  summary,
  activeKey,
  onSelect,
  isLoading,
}: LeadSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
      {CARDS.map(({ key, label, icon: Icon, getValue, accent }) => {
        const value = summary ? getValue(summary) : 0;
        const isActive = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            disabled={isLoading}
            className={cn(
              "rounded-xl border bg-card px-3 py-2.5 text-left shadow-xs transition-all cursor-pointer",
              accent,
              isActive && "ring-2 ring-primary border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                {label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            <p className="text-xl font-extrabold tracking-tight text-foreground">
              {isLoading ? "—" : value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
