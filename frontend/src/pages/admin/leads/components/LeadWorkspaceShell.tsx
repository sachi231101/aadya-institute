import React from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { cn } from "@/utils";

export interface LeadWorkspaceShellProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary CTA(s) — keep secondary actions in a DropdownMenu. */
  primaryAction?: React.ReactNode;
  /** Quiet KPI / metric row (max 4). */
  metrics?: React.ReactNode;
  /** Unified search / filter bar. */
  toolbar?: React.ReactNode;
  /** Banners, toasts hosts, read-only notices above the header. */
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  density?: "normal" | "compact" | "none";
  maxWidth?: "full" | "default" | "narrow";
}

/**
 * Shared Lead Management workspace frame:
 * page header → optional metrics/toolbar → body.
 */
export function LeadWorkspaceShell({
  title,
  description,
  primaryAction,
  metrics,
  toolbar,
  banner,
  children,
  className,
  density = "compact",
  maxWidth = "default",
}: LeadWorkspaceShellProps) {
  return (
    <PageContainer density={density} maxWidth={maxWidth} className={className}>
      {banner}
      <PageHeader
        title={title}
        description={description}
        actions={primaryAction}
      />
      {metrics || toolbar ? (
        <div className="min-w-0 space-y-2.5">
          {metrics ? <div className="min-w-0">{metrics}</div> : null}
          {toolbar ? <div className="min-w-0">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0 space-y-4")}>{children}</div>
    </PageContainer>
  );
}
