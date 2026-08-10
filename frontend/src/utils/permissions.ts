import { UserRole } from "../constants/roles";

export const hasRoleAccess = (userRole?: UserRole, allowedRoles: UserRole[] = []): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};
