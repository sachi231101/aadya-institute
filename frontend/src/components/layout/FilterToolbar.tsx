import React from "react";
import { cn } from "@/utils";

export interface FilterToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Standard search / filter / action row spacing (`items-center gap-3`).
 * Do not add horizontal padding (`px-*` / `p-4`) on the toolbar or via className —
 * page edges come from PageContainer.
 */
export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("toolbar-container items-center gap-3", className)} {...props}>
      {children}
    </div>
  );
};
