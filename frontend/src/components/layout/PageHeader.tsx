import React from "react";
import { cn } from "@/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Clean page title / description / actions shell.
 * Pass plain text (or simple nodes) for `title` — do not wrap decorative icon wells.
 * Prefer 1–2 primary CTAs in `actions`; park extras in a DropdownMenu.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
};
