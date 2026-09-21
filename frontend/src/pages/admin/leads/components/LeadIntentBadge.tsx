import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

export const LEAD_INTENTS = [
  "INTERESTED",
  "HIGHLY_INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "CALL_BACK_LATER",
  "NOT_REACHABLE",
  "WRONG_NUMBER",
  "ALREADY_JOINED_ANOTHER",
  "NEED_MORE_INFORMATION",
  "ADMISSION_INTERESTED",
  "CONVERTED",
] as const;

export type LeadIntent = (typeof LEAD_INTENTS)[number];

const POSITIVE = new Set<string>([
  "INTERESTED",
  "HIGHLY_INTERESTED",
  "ADMISSION_INTERESTED",
  "CONVERTED",
]);
const NEGATIVE = new Set<string>([
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "ALREADY_JOINED_ANOTHER",
]);
const NEUTRAL_WARN = new Set<string>([
  "FOLLOW_UP_REQUIRED",
  "CALL_BACK_LATER",
  "NEED_MORE_INFORMATION",
  "NOT_REACHABLE",
]);

export function formatLeadIntentLabel(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Short labels for dense table columns. */
const SHORT_INTENT_LABELS: Record<string, string> = {
  INTERESTED: "Interested",
  HIGHLY_INTERESTED: "Hot",
  NOT_INTERESTED: "Not int.",
  FOLLOW_UP_REQUIRED: "Follow up",
  CALL_BACK_LATER: "Callback",
  NOT_REACHABLE: "Unreachable",
  WRONG_NUMBER: "Wrong #",
  ALREADY_JOINED_ANOTHER: "Joined else",
  NEED_MORE_INFORMATION: "Need info",
  ADMISSION_INTERESTED: "Admission",
  CONVERTED: "Converted",
};

export function formatLeadIntentShortLabel(value?: string | null): string {
  if (!value) return "";
  const key = value.toUpperCase();
  return SHORT_INTENT_LABELS[key] || formatLeadIntentLabel(value);
}

function intentTone(intent: string): string {
  const key = intent.toUpperCase();
  if (POSITIVE.has(key)) {
    return "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (NEGATIVE.has(key)) {
    return "border border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (NEUTRAL_WARN.has(key)) {
    return "border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  return "border border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
}

export interface LeadIntentBadgeProps {
  intent?: string | null;
  className?: string;
  emptyLabel?: string;
  /** Compact badge + short label for dense tables. */
  size?: "default" | "sm";
}

export const LeadIntentBadge: React.FC<LeadIntentBadgeProps> = ({
  intent,
  className,
  emptyLabel,
  size = "default",
}) => {
  const compact = size === "sm";
  if (!intent) {
    if (!emptyLabel) return null;
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border border-border",
          compact && "h-5 px-1.5 py-0 text-[10px] leading-none",
          className
        )}
      >
        {emptyLabel}
      </Badge>
    );
  }
  const label = compact
    ? formatLeadIntentShortLabel(intent)
    : formatLeadIntentLabel(intent);
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium whitespace-nowrap",
        compact && "h-5 px-1.5 py-0 text-[10px] leading-none",
        intentTone(intent),
        className
      )}
      title={formatLeadIntentLabel(intent)}
    >
      {label}
    </Badge>
  );
};
