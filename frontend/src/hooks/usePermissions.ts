import React from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  permissionsToAccessState,
  type PermissionModuleDefinition,
  type ItemAccessState,
  isBaselineOnlyPermissions,
} from "@/utils/permission-utils";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/services/users.api";

export type PermissionRoleScope = "CENTER_MANAGER" | "COUNSELLOR";

function getRoleScope(roles: string[] | undefined): PermissionRoleScope | null {
  if (!roles?.length) return null;
  if (roles.includes("ADMIN")) return null;
  if (roles.includes("COUNSELLOR")) return "COUNSELLOR";
  if (roles.includes("CENTER_MANAGER")) return "CENTER_MANAGER";
  return null;
}

export const usePermissions = () => {
  const user = useAuthStore((s) => s.user);
  const roleScope = getRoleScope(user?.roles);
  const isAdmin = user?.roles?.includes("ADMIN");

  const { data: catalogRes } = useQuery({
    queryKey: ["permission-catalog", roleScope],
    queryFn: () => usersApi.getPermissionCatalog(roleScope!),
    enabled: Boolean(roleScope),
  });

  const catalog: PermissionModuleDefinition[] = catalogRes?.data ?? [];
  const permissions = user?.permissions ?? [];

  const accessByItem: Record<string, ItemAccessState> = React.useMemo(() => {
    if (isAdmin || !roleScope || catalog.length === 0) return {};
    return permissionsToAccessState(permissions, catalog);
  }, [isAdmin, roleScope, permissions, catalog]);

  const canReadItem = (itemKey: string): boolean => {
    if (isAdmin) return true;
    return accessByItem[itemKey]?.show ?? false;
  };

  const canEditItem = (itemKey: string): boolean => {
    if (isAdmin) return true;
    return accessByItem[itemKey]?.editable ?? false;
  };

  const hasPermission = (permissionName: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permissionName);
  };

  const isReadOnly = (itemKey: string): boolean =>
    canReadItem(itemKey) && !canEditItem(itemKey);

  const hasAnyModuleAccess = React.useMemo(() => {
    if (isAdmin) return true;
    if (!roleScope || isBaselineOnlyPermissions(permissions)) return false;
    return Object.values(accessByItem).some((a) => a.show);
  }, [isAdmin, roleScope, permissions, accessByItem]);

  return {
    user,
    isAdmin,
    roleScope,
    permissions,
    accessByItem,
    canReadItem,
    canEditItem,
    hasPermission,
    isReadOnly,
    hasAnyModuleAccess,
  };
};
