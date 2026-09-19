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

function intentVariant(
  intent: string
): "success" | "destructive" | "warning" | "secondary" {
  const key = intent.toUpperCase();
  if (POSITIVE.has(key)) return "success";
  if (NEGATIVE.has(key)) return "destructive";
  if (NEUTRAL_WARN.has(key)) return "warning";
  return "secondary";
}

export interface LeadIntentBadgeProps {
  intent?: string | null;
  className?: string;
  emptyLabel?: string;
}

export const LeadIntentBadge: React.FC<LeadIntentBadgeProps> = ({
  intent,
  className,
  emptyLabel,
}) => {
  if (!intent) {
    if (!emptyLabel) return null;
    return (
      <Badge variant="outline" className={cn("font-medium", className)}>
        {emptyLabel}
      </Badge>
    );
  }
  return (
    <Badge
      variant={intentVariant(intent)}
      className={cn("font-medium", className)}
      title={intent}
    >
      {formatLeadIntentLabel(intent)}
    </Badge>
  );
};
