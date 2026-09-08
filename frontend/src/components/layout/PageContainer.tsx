import React from "react";
import { cn } from "@/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "full" | "default" | "narrow";
  spacing?: "normal" | "compact" | "none";
  children: React.ReactNode;
}

/**
 * Standard PageContainer providing globally consistent padding, max-width,
 * and vertical rhythm across all screens and portals.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = "default",
  spacing = "normal",
  className,
  children,
  ...props
}) => {
  const maxWidthClass =
    maxWidth === "full"
      ? "w-full"
      : maxWidth === "narrow"
      ? "max-w-5xl mx-auto"
      : "max-w-[1720px] mx-auto";

  const spacingClass =
    spacing === "none"
      ? ""
      : spacing === "compact"
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
