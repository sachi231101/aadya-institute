import React from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  itemKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "read" | "write";
}

/** When true, page-level ReadOnlyBanner is skipped because the layout already shows one. */
export const LayoutReadOnlyBannerContext = React.createContext(false);

/** Hide children unless user has read (default) or write access for the item. */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  itemKey,
  children,
  fallback = null,
  mode = "write",
}) => {
  const { canReadItem, canEditItem, isAdmin, roleScope } = usePermissions();
  // Admin bypasses gates. Unscoped roles (FACULTY/STUDENT) are not CM/Counsellor
  // matrix users — leave UI visible; their APIs enforce role-specific rules.
  if (isAdmin) return <>{children}</>;
  if (!roleScope) return <>{children}</>;
  const allowed = mode === "read" ? canReadItem(itemKey) : canEditItem(itemKey);
  return allowed ? <>{children}</> : <>{fallback}</>;
};

interface ReadOnlyBannerProps {
  itemKey: string;
  label?: string;
  fromLayout?: boolean;
}

/** Banner shown on pages where user has read-only access. */
export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({
  itemKey,
  label,
  fromLayout = false,
}) => {
  const layoutShowsBanner = React.useContext(LayoutReadOnlyBannerContext);
  const { isReadOnly, isAdmin } = usePermissions();
  if (!fromLayout && layoutShowsBanner) return null;
  if (isAdmin || !isReadOnly(itemKey)) return null;
  return (
    <div className={`${fromLayout ? "mx-4 mt-4 " : ""}mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2`}>
      <span className="font-semibold">Read-only access</span>
      <span className="text-amber-800">
        You can view {label ? `"${label}"` : "this section"} but cannot make changes.
      </span>
    </div>
  );
};
