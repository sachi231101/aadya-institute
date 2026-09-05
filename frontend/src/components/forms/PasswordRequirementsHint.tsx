import React from "react";
import { usePasswordRequirements } from "@/hooks/usePasswordRequirements";

interface PasswordRequirementsHintProps {
  className?: string;
}

/** Shows institute password policy rules under password fields. */
export const PasswordRequirementsHint: React.FC<PasswordRequirementsHintProps> = ({
  className,
}) => {
  const { requirements, isLoading } = usePasswordRequirements();

  if (isLoading && requirements.length === 0) {
    return null;
  }

  return (
    <div
      className={
        className ??
        "rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      }
    >
      <p className="font-semibold text-foreground mb-1">Password requirements</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {requirements.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
};
