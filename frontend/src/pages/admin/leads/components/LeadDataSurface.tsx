import React from "react";
import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

export interface LeadDataSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Clean bordered list surface for Lead Workspace tables.
 * Outer frame + horizontal row lines (no busy cell grid).
 */
export function LeadDataSurface({ children, className }: LeadDataSurfaceProps) {
  return (
    <Card
      className={cn(
        "border border-border shadow-xs rounded-xl overflow-hidden bg-card",
        className
      )}
    >
      <CardContent className="p-0 sm:p-0">
        <div
          className={cn(
            "min-w-0",
            // Clean table chrome — bordered cells for a clear grid
            "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
            "[&_thead]:bg-muted/50",
            "[&_th]:h-9 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold",
            "[&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground",
            "[&_th]:border [&_th]:border-border [&_th]:whitespace-nowrap",
            "[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:border [&_td]:border-border",
            "[&_tbody_tr]:hover:bg-muted/30 [&_tbody_tr]:transition-colors"
          )}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export type LeadListStateKind = "loading" | "error" | "empty";

export interface LeadListStateProps {
  kind: LeadListStateKind;
  message: string;
  onRetry?: () => void;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

/** Shared loading / empty / error block for lead lists and tables. */
export function LeadListState({
  kind,
  message,
  onRetry,
  icon: Icon,
  action,
  className,
}: LeadListStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-14 text-center text-sm",
        kind === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
      role={kind === "error" ? "alert" : "status"}
    >
      {kind === "loading" ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : kind === "error" ? (
        <AlertCircle className="h-5 w-5" />
      ) : Icon ? (
        <Icon className="h-8 w-8 opacity-40" />
      ) : null}
      <p className="font-medium max-w-md">{message}</p>
      {kind === "error" && onRetry ? (
        <Button type="button" variant="link" className="h-auto p-0" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
      {kind === "empty" && action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
