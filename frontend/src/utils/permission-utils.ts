export type PermissionRoleScope = "CENTER_MANAGER" | "COUNSELLOR";

export interface PermissionItemDefinition {
  key: string;
  label: string;
  readPermissions: string[];
  writePermissions: string[];
}

export interface PermissionModuleDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  items: PermissionItemDefinition[];
}

export interface ItemAccessState {
  show: boolean;
  editable: boolean;
}

export const ALWAYS_ON_PERMISSIONS = [
  "dashboard.read",
  "branch.read",
  "notification.read",
  "notification.resend",
];

export const ITEM_PERMISSION_PREFIX = "item.";

export const itemShowPermission = (itemKey: string): string =>
  `${ITEM_PERMISSION_PREFIX}${itemKey}`;

export const itemWritePermission = (itemKey: string): string =>
  `${ITEM_PERMISSION_PREFIX}${itemKey}.write`;

export const isItemGrantFlag = (permissionName: string): boolean =>
  permissionName.startsWith(ITEM_PERMISSION_PREFIX);

export const hasItemGrantFlags = (permissionNames: string[] | undefined): boolean =>
  Boolean(permissionNames?.some(isItemGrantFlag));

export const buildPermissionsFromAccess = (
  accessByItem: Record<string, ItemAccessState>,
  catalog: PermissionModuleDefinition[]
): string[] => {
  const set = new Set<string>(ALWAYS_ON_PERMISSIONS);
  for (const mod of catalog) {
    for (const item of mod.items) {
      const access = accessByItem[item.key];
      if (!access?.show) continue;
      set.add(itemShowPermission(item.key));
      item.readPermissions.forEach((p) => set.add(p));
      if (access.editable) {
        set.add(itemWritePermission(item.key));
        item.writePermissions.forEach((p) => set.add(p));
      }
    }
  }
  return Array.from(set);
};

export const permissionsToAccessState = (
  permissions: string[],
  catalog: PermissionModuleDefinition[]
): Record<string, ItemAccessState> => {
  const permSet = new Set(permissions);
  const result: Record<string, ItemAccessState> = {};
  const useItemFlags = hasItemGrantFlags(permissions);
  for (const mod of catalog) {
    for (const item of mod.items) {
      if (useItemFlags) {
        const show = permSet.has(itemShowPermission(item.key));
        const editable = show && permSet.has(itemWritePermission(item.key));
        result[item.key] = { show, editable };
        continue;
      }
      const hasRead = item.readPermissions.some((p) => permSet.has(p));
      const hasWrite =
        item.writePermissions.length > 0 &&
        item.writePermissions.every((p) => permSet.has(p));
      result[item.key] = { show: hasRead, editable: hasWrite };
    }
  }
  return result;
};

export const createFullAccessState = (
  catalog: PermissionModuleDefinition[]
): Record<string, ItemAccessState> => {
  const result: Record<string, ItemAccessState> = {};
  for (const mod of catalog) {
    for (const item of mod.items) {
      result[item.key] = { show: true, editable: true };
    }
  }
  return result;
};

export const createEmptyAccessState = (
  catalog: PermissionModuleDefinition[]
): Record<string, ItemAccessState> => {
  const result: Record<string, ItemAccessState> = {};
  for (const mod of catalog) {
    for (const item of mod.items) {
      result[item.key] = { show: false, editable: false };
    }
  }
  return result;
};

export const hasAnyAccess = (access: ItemAccessState | undefined): boolean =>
  Boolean(access?.show);

export const isEditable = (access: ItemAccessState | undefined): boolean =>
  Boolean(access?.editable);

export const hasAnyModuleAccess = (
  accessByItem: Record<string, ItemAccessState>
): boolean => Object.values(accessByItem).some((a) => a.show);

export const isBaselineOnlyPermissions = (permissions: string[]): boolean => {
  const baseline = new Set(ALWAYS_ON_PERMISSIONS);
  const relevant = permissions.filter((p) => !isItemGrantFlag(p));
  return (
    relevant.length > 0 &&
    relevant.every((p) => baseline.has(p)) &&
    !hasItemGrantFlags(permissions)
  );
};

/** Default matrix state for newly created CM/Counsellor — no modules until admin assigns. */
export const createDefaultAccessState = createEmptyAccessState;
