import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

const STAGE_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  CONTACTED: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
  INTERESTED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  FOLLOW_UP: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  CONVERTED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  LOST: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
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
}

export function LeadStageBadge({ stage, label, className }: LeadStageBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        STAGE_STYLES[stage] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {leadStageLabel(stage, label)}
    </Badge>
  );
}
