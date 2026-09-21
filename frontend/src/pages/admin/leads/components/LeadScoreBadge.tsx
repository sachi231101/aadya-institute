import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";

export type LeadTemperature = "HOT" | "WARM" | "COOL" | "COLD";
export type LeadScoreBand = "hot" | "warm" | "cool" | "cold" | null;

export type ScoreTemperatureBands = {
  hotMin: number;
  warmMin: number;
  coolMin: number;
};

/** Defaults match InstituteAiCallingConfig / backend DEFAULT_SCORE_TEMPERATURE_BANDS. */
export const DEFAULT_SCORE_TEMPERATURE_BANDS: ScoreTemperatureBands = {
  hotMin: 80,
  warmMin: 60,
  coolMin: 40,
};

export function scoreToTemperature(
  score?: number | null,
  bands: ScoreTemperatureBands = DEFAULT_SCORE_TEMPERATURE_BANDS
): LeadTemperature | null {
  if (score == null || Number.isNaN(score) || score <= 0) return null;
  if (score >= bands.hotMin) return "HOT";
  if (score >= bands.warmMin) return "WARM";
  if (score >= bands.coolMin) return "COOL";
  return "COLD";
}

/** Hot ≥ hotMin, Warm ≥ warmMin, Cool ≥ coolMin, else Cold; unscored / 0 = no band */
export function getLeadScoreBand(
  score?: number | null,
  bands: ScoreTemperatureBands = DEFAULT_SCORE_TEMPERATURE_BANDS
): LeadScoreBand {
  const temp = scoreToTemperature(score, bands);
  return temp ? (temp.toLowerCase() as NonNullable<LeadScoreBand>) : null;
}

export function normalizeLeadTemperature(
  value?: string | null
): LeadTemperature | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  if (key === "HOT" || key === "WARM" || key === "COOL" || key === "COLD") {
    return key;
  }
  return null;
}

const BAND_STYLES: Record<NonNullable<LeadScoreBand>, string> = {
  hot: "border border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300",
  warm: "border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  cool: "border border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  cold: "border border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

const BAND_LABELS: Record<NonNullable<LeadScoreBand>, string> = {
  hot: "HOT",
  warm: "WARM",
  cool: "COOL",
  cold: "COLD",
};

interface LeadScoreBadgeProps {
  score?: number | null;
  /** Prefer stored Lead.leadTemperature when available. */
  temperature?: string | null;
  /** Admin-configurable bands; defaults 80 / 60 / 40. */
  bands?: ScoreTemperatureBands;
  showScore?: boolean;
  className?: string;
}

export function LeadScoreBadge({
  score,
  temperature,
  bands = DEFAULT_SCORE_TEMPERATURE_BANDS,
  showScore = true,
  className,
}: LeadScoreBadgeProps) {
  const fromStored = normalizeLeadTemperature(temperature);
  const band: LeadScoreBand = fromStored
    ? (fromStored.toLowerCase() as NonNullable<LeadScoreBand>)
    : getLeadScoreBand(score, bands);

  if (!band) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border px-1.5 h-5 text-[10px] text-muted-foreground",
          className
        )}
      >
        {showScore && score != null ? `${score}` : "—"}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-semibold gap-1 border", BAND_STYLES[band], className)}
      title={score != null ? `Score: ${score}/100 · ${BAND_LABELS[band]}` : BAND_LABELS[band]}
    >
      {BAND_LABELS[band]}
      {showScore && score != null ? <span className="opacity-80">{score}</span> : null}
    </Badge>
  );
}
