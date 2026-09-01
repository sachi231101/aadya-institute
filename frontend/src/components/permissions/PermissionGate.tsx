import React from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  itemKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "read" | "write";
}

/** Hide children unless user has read (default) or write access for the item. */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  itemKey,
  children,
  fallback = null,
  mode = "write",
}) => {
  const { canReadItem, canEditItem, isAdmin } = usePermissions();
  if (isAdmin) return <>{children}</>;
  const allowed = mode === "read" ? canReadItem(itemKey) : canEditItem(itemKey);
  return allowed ? <>{children}</> : <>{fallback}</>;
};

/** Banner shown on pages where user has read-only access. */
export const ReadOnlyBanner: React.FC<{ itemKey: string; label?: string }> = ({
  itemKey,
  label,
}) => {
  const { isReadOnly, isAdmin } = usePermissions();
  if (isAdmin || !isReadOnly(itemKey)) return null;
  return (
    <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2">
      <span className="font-semibold">Read-only access</span>
      <span className="text-amber-800">
        You can view {label ? `"${label}"` : "this section"} but cannot make changes.
      </span>
    </div>
  );
};
