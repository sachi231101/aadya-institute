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
  catalog: PermissionModuleDefinition[],
  fallbackMaps?: {
    read: Record<string, string[]>;
    write: Record<string, string[]>;
  }
): string[] => {
  const set = new Set<string>(ALWAYS_ON_PERMISSIONS);
  const defs = new Map<string, { read: string[]; write: string[] }>();

  for (const mod of catalog) {
    for (const item of mod.items) {
      defs.set(item.key, {
        read: item.readPermissions ?? [],
        write: item.writePermissions ?? [],
      });
    }
  }

  // If catalog failed to load / is empty, still resolve from FE maps so Grant all can save
  if (fallbackMaps) {
    for (const key of Object.keys(accessByItem)) {
      if (defs.has(key)) continue;
      defs.set(key, {
        read: fallbackMaps.read[key] ?? [],
        write: fallbackMaps.write[key] ?? [],
      });
    }
  }

  for (const [itemKey, access] of Object.entries(accessByItem)) {
    if (!access?.show) continue;
    const def = defs.get(itemKey);
    set.add(itemShowPermission(itemKey));
    if (def) {
      def.read.forEach((p) => set.add(p));
      if (access.editable && def.write.length > 0) {
        set.add(itemWritePermission(itemKey));
        def.write.forEach((p) => set.add(p));
      }
    } else if (access.editable) {
      set.add(itemWritePermission(itemKey));
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
      result[item.key] = {
        show: true,
        editable: (item.writePermissions?.length ?? 0) > 0,
      };
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
