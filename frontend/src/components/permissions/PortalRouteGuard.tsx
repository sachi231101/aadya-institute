import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import {
  CENTER_NAV_PERMISSION_KEYS,
  COUNSELOR_NAV_PERMISSION_KEYS,
  canAccessNavUrl,
  resolveNavItemKey,
  isAlwaysAllowedPortalPath,
} from "@/constants/nav-permissions";

interface PortalRouteGuardProps {
  portal: "center" | "counselor";
  children: React.ReactNode;
}

export const PortalRouteGuard: React.FC<PortalRouteGuardProps> = ({
  portal,
  children,
}) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("SUPER_ADMIN");

  if (isAdmin) {
    return <>{children}</>;
  }

  const pathname = location.pathname;
  const dashboardPath = portal === "center" ? "/center/dashboard" : "/counselor/dashboard";

  if (isAlwaysAllowedPortalPath(pathname, portal)) {
    return <>{children}</>;
  }

  const navKeyMap =
    portal === "center" ? CENTER_NAV_PERMISSION_KEYS : COUNSELOR_NAV_PERMISSION_KEYS;
  const itemKey = resolveNavItemKey(pathname, navKeyMap);

  if (!itemKey) {
    return <>{children}</>;
  }

  const allowed = canAccessNavUrl(
    pathname,
    user?.permissions,
    user?.modulePermissions,
    navKeyMap,
    isAdmin
  );

  if (!allowed) {
    return <Navigate to={dashboardPath} replace state={{ accessDenied: true }} />;
  }

  return <>{children}</>;
};
