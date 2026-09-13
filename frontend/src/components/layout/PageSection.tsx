import React from "react";
import { cn } from "@/utils";

export interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  density?: "normal" | "compact";
  children: React.ReactNode;
}

/**
 * Section block with optional header and standard vertical rhythm.
 */
export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  actions,
  density = "normal",
  className,
  children,
  ...props
}) => {
  const hasHeader = title != null || description != null || actions != null;

  return (
    <section
      className={cn(
        density === "compact" ? "section-stack-compact" : "section-stack",
        className
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="section-header-spacing flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            {title != null ? <h2 className="section-title">{title}</h2> : null}
            {description != null ? (
              <p className="page-subtitle">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
};
