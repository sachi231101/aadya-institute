import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

export type LeadScoreBand = "hot" | "warm" | "cold" | null;

/** Hot ≥70, Warm 40–69, Cold 1–39; unscored / 0 = no band */
export function getLeadScoreBand(score?: number | null): LeadScoreBand {
  if (score == null || score <= 0) return null;
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

const BAND_STYLES: Record<NonNullable<LeadScoreBand>, string> = {
  hot: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  warm: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  cold: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300",
};

const BAND_LABELS: Record<NonNullable<LeadScoreBand>, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

interface LeadScoreBadgeProps {
  score?: number | null;
  showScore?: boolean;
  className?: string;
}

export function LeadScoreBadge({ score, showScore = true, className }: LeadScoreBadgeProps) {
  const band = getLeadScoreBand(score);

  if (!band) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {showScore && score != null ? `${score}` : "—"}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-semibold gap-1", BAND_STYLES[band], className)}
      title={score != null ? `Score: ${score}/100` : undefined}
    >
      {BAND_LABELS[band]}
      {showScore && score != null ? <span className="opacity-80">{score}</span> : null}
    </Badge>
  );
}
