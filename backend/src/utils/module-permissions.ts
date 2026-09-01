/**
 * Module-to-Permission mapping — legacy API delegates to permission-catalog.
 */

import {
  resolveModuleKeysToPermissions,
  resolvePermissionsToModuleKeys,
  toLegacyModuleKeys,
  getFullAccessPermissions,
  getAllCatalogModuleKeys,
  type PermissionRoleScope,
} from "./permission-catalog";

export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  permissions: string[];
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [];

export const ALWAYS_ON_PERMISSIONS: string[] = [
  "dashboard.read",
  "branch.read",
  "notification.read",
  "notification.resend",
];

/** ERP module keys + legacy aliases accepted by validation. */
export const ALL_MODULE_KEYS = [
  ...getAllCatalogModuleKeys("CENTER_MANAGER"),
  "leads_ai_calling",
  "admissions",
  "counsellor",
  "students",
  "faculty",
  "courses",
  "schedule",
  "fees",
  "reports",
  "masters",
  "examinations",
  "targets",
  "notifications",
  "placement",
  "batches",
  "assignments",
];

export const resolveModulePermissions = (
  moduleKeys: string[],
  role: PermissionRoleScope = "CENTER_MANAGER"
): string[] => {
  if (moduleKeys.length === 0) return [...ALWAYS_ON_PERMISSIONS];
  return resolveModuleKeysToPermissions(moduleKeys, role);
};

export const resolvePermissionsToModules = (
  permissionNames: string[],
  role: PermissionRoleScope = "CENTER_MANAGER"
): string[] => {
  return toLegacyModuleKeys(resolvePermissionsToModuleKeys(permissionNames, role));
};

export { getFullAccessPermissions, resolvePermissionsToModuleKeys, resolveModuleKeysToPermissions, toLegacyModuleKeys };
