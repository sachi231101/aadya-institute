import React, { useMemo, useState } from "react";
import {
  Shield,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUsers, useUpdateUserPermissions } from "@/hooks/useUsers";
import { usersApi, type UserResponse } from "@/services/users.api";
import { PermissionMatrix } from "@/components/permissions/PermissionMatrix";
import {
  buildPermissionsFromAccess,
  permissionsToAccessState,
  createDefaultAccessState,
  isBaselineOnlyPermissions,
  type ItemAccessState,
  type PermissionModuleDefinition,
  type PermissionRoleScope,
} from "@/utils/permission-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CENTER_MANAGER: "Center Manager",
  COUNSELLOR: "Counsellor",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

function getRoleScope(user: UserResponse): PermissionRoleScope {
  return user.roles.includes("COUNSELLOR") ? "COUNSELLOR" : "CENTER_MANAGER";
}

function getCatalogForUser(
  user: UserResponse,
  centerManagerCatalog: PermissionModuleDefinition[],
  counsellorCatalog: PermissionModuleDefinition[]
): PermissionModuleDefinition[] {
  return getRoleScope(user) === "COUNSELLOR" ? counsellorCatalog : centerManagerCatalog;
}

function getDefaultAccessState(
  user: UserResponse,
  catalog: PermissionModuleDefinition[]
): Record<string, ItemAccessState> {
  if (user.permissions && catalog.length > 0) {
    return permissionsToAccessState(user.permissions, catalog);
  }
  if (catalog.length > 0) {
    return createDefaultAccessState(catalog);
  }
  return {};
}

function countEnabledItems(access: Record<string, ItemAccessState>): number {
  return Object.values(access).filter((a) => a.show).length;
}

function countTotalItems(catalog: PermissionModuleDefinition[]): number {
  return catalog.reduce((sum, mod) => sum + mod.items.length, 0);
}

export const RolesPermissions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [draftAccess, setDraftAccess] = useState<Record<string, Record<string, ItemAccessState>>>({});

  const { data, isLoading, isError, refetch } = useUsers({
    limit: 100,
    search: searchTerm || undefined,
  });
  const updatePermissions = useUpdateUserPermissions();

  const { data: cmCatalogRes } = useQuery({
    queryKey: ["permission-catalog", "CENTER_MANAGER"],
    queryFn: () => usersApi.getPermissionCatalog("CENTER_MANAGER"),
  });
  const { data: counsellorCatalogRes } = useQuery({
    queryKey: ["permission-catalog", "COUNSELLOR"],
    queryFn: () => usersApi.getPermissionCatalog("COUNSELLOR"),
  });

  const centerManagerCatalog: PermissionModuleDefinition[] = cmCatalogRes?.data ?? [];
  const counsellorCatalog: PermissionModuleDefinition[] = counsellorCatalogRes?.data ?? [];

  const adminUsers = useMemo(() => {
    const users = data?.data || [];
    return users.filter(
      (u) =>
        u.roles.includes("ADMIN") ||
        u.roles.includes("CENTER_MANAGER") ||
        u.roles.includes("COUNSELLOR")
    );
  }, [data]);

  const getActiveAccess = (user: UserResponse): Record<string, ItemAccessState> => {
    if (user.id in draftAccess) {
      return draftAccess[user.id];
    }
    const catalog = getCatalogForUser(user, centerManagerCatalog, counsellorCatalog);
    return getDefaultAccessState(user, catalog);
  };

  const handleAccessChange = (userId: string, next: Record<string, ItemAccessState>) => {
    setDraftAccess((prev) => ({ ...prev, [userId]: next }));
  };

  const savePermissions = async (user: UserResponse) => {
    const catalog = getCatalogForUser(user, centerManagerCatalog, counsellorCatalog);
    const access = draftAccess[user.id] ?? getDefaultAccessState(user, catalog);
    const permissions = buildPermissionsFromAccess(access, catalog);

    try {
      await updatePermissions.mutateAsync({
        id: user.id,
        data: { permissions },
      });
      setDraftAccess((prev) => {
        const copy = { ...prev };
        delete copy[user.id];
        return copy;
      });
    } catch {
      alert("Failed to update permissions.");
    }
  };

  const hasDraft = (userId: string) => userId in draftAccess;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Roles & Permissions</h2>
        <p className="text-sm text-text-secondary">
          RBAC configuration for institute staff roles and granular submodule access. New users start with baseline access only (Dashboard, ASK ME, Settings).
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {isLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
              Loading users...
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-6 h-6 inline mr-2" />
              Failed to load users.
              <Button variant="link" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : adminUsers.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
              No admin users found.
            </div>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((user) => {
                const isExpanded = expandedUserId === user.id;
                const roleScope = getRoleScope(user);
                const catalog = getCatalogForUser(user, centerManagerCatalog, counsellorCatalog);
                const activeAccess = getActiveAccess(user);
                const enabledCount = countEnabledItems(activeAccess);
                const totalItems = countTotalItems(catalog);

                return (
                  <Collapsible
                    key={user.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedUserId(open ? user.id : null)}
                  >
                    <div className="border border-border/50 rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 text-left transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-text-secondary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-text-secondary" />
                            )}
                            <div>
                              <p className="font-semibold text-text-primary">{user.name}</p>
                              <p className="text-xs text-text-secondary">
                                {user.email || user.phone || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline">
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                            <Badge variant="secondary">
                              {totalItems > 0
                                ? enabledCount === 0 && isBaselineOnlyPermissions(user.permissions ?? [])
                                  ? "Baseline only"
                                  : `${enabledCount}/${totalItems} items`
                                : "Loading…"}
                            </Badge>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-border/50 p-4 bg-slate-50/40 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-secondary">
                              Submodule permissions for {user.name}
                            </p>
                            {hasDraft(user.id) && (
                              <Button
                                size="sm"
                                className="bg-[#1769AA] text-white"
                                onClick={() => savePermissions(user)}
                                disabled={updatePermissions.isPending}
                              >
                                {updatePermissions.isPending && (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                )}
                                Save Changes
                              </Button>
                            )}
                          </div>

                          <PermissionMatrix
                            role={roleScope}
                            value={activeAccess}
                            onChange={(next) => handleAccessChange(user.id, next)}
                            disabled={updatePermissions.isPending}
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-text-primary mb-3">ERP Module Catalog</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Submodules</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Center Manager</TableHead>
                <TableHead>Counsellor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centerManagerCatalog.map((mod) => {
                const counsellorMod = counsellorCatalog.find((c) => c.key === mod.key);
                return (
                <TableRow key={mod.key}>
                  <TableCell className="font-medium">{mod.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{mod.items.length} items</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                      Full Access
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Configurable</Badge>
                  </TableCell>
                  <TableCell>
                    {counsellorMod ? (
                      <Badge variant="outline">Configurable</Badge>
                    ) : (
                      <Badge variant="outline" className="opacity-50">
                        N/A
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
