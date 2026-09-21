import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

const STAGE_STYLES: Record<string, string> = {
  NEW: "border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CONTACTED:
    "border border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  ASSIGNED:
    "border border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  INTERESTED:
    "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  FOLLOW_UP:
    "border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  CONVERTED:
    "border border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300",
  LOST: "border border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ASSIGNED: "Assigned",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const DEFAULT_LEAD_STAGE_PIPELINE = [
  "NEW",
  "CONTACTED",
  "ASSIGNED",
  "INTERESTED",
  "FOLLOW_UP",
  "CONVERTED",
] as const;

export const TERMINAL_AI_CALL_STATUSES = [
  "COMPLETED",
  "NO_ANSWER",
  "BUSY",
  "FAILED",
  "CALLBACK_REQUESTED",
];

export function leadStageLabel(stage: string, masterLabel?: string): string {
  return masterLabel || STAGE_LABELS[stage] || stage;
}

export function isTerminalAiCallStatus(status?: string): boolean {
  if (!status) return false;
  return TERMINAL_AI_CALL_STATUSES.includes(status.toUpperCase());
}

interface LeadStageBadgeProps {
  stage: string;
  label?: string;
  className?: string;
  /** Compact badge for dense tables. */
  size?: "default" | "sm";
}

export function LeadStageBadge({
  stage,
  label,
  className,
  size = "default",
}: LeadStageBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold whitespace-nowrap border",
        size === "sm" && "h-5 px-1.5 py-0 text-[10px] leading-none font-medium",
        STAGE_STYLES[stage] ??
          "border border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
        className
      )}
    >
      {leadStageLabel(stage, label)}
    </Badge>
  );
}
