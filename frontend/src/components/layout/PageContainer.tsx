import React from "react";
import { cn } from "@/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "full" | "default" | "narrow";
  /** @deprecated Prefer `density`. Kept for existing call sites. */
  spacing?: "normal" | "compact" | "none";
  density?: "normal" | "compact" | "none";
  /** When false, omit horizontal/vertical page padding (layout owns padding). */
  padded?: boolean;
  children: React.ReactNode;
}

/**
 * Standard page shell: max-width, padding, and vertical rhythm.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = "default",
  spacing,
  density,
  padded = true,
  className,
  children,
  ...props
}) => {
  const resolvedDensity = density ?? spacing ?? "normal";

  const maxWidthClass =
    maxWidth === "full"
      ? "w-full"
      : maxWidth === "narrow"
        ? "max-w-5xl mx-auto"
        : "max-w-[1720px] mx-auto";

  const spacingClass =
    !padded || resolvedDensity === "none"
      ? ""
      : resolvedDensity === "compact"
        ? "p-3.5 sm:p-5 lg:p-6 space-y-4 pb-12"
        : "p-4 sm:p-6 lg:p-8 space-y-6 pb-16";

  return (
    <div
      className={cn(
        "w-full text-foreground min-h-[calc(100vh-3rem)]",
        maxWidthClass,
        spacingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
