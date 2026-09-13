import React from "react";
import { cn } from "@/utils";

/** Preferred column recipes — use 2 / 3 / 4 only (avoids orphan last-row tiles). */
export const METRIC_GRID_COLUMNS = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export interface MetricGridProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: "normal" | "compact";
  /** Prefer METRIC_GRID_COLUMNS[2|3|4]; avoid 5+ column recipes. */
  columns?: string;
  children: React.ReactNode;
}

/**
 * Responsive metric / card grid with design-system gaps.
 * Default is the 4-column recipe; pass METRIC_GRID_COLUMNS[2] or [3] to match tile count.
 */
export const MetricGrid: React.FC<MetricGridProps> = ({
  density = "normal",
  columns = METRIC_GRID_COLUMNS[4],
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        density === "compact" ? "grid-cards-compact" : "grid-cards",
        columns,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
