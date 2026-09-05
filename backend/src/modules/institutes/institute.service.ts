import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import { createAuditLog } from "../../utils/audit-log.util";
import * as repo from "./institute.repository";
import type { CreateInstituteDto, UpdateInstituteDto } from "./institute.validation";
import type { OrganizationAuditMeta } from "./institute.types";

const isSuperAdmin = (roles: string[] = []): boolean =>
  roles.some((r) => r.toUpperCase() === "SUPER_ADMIN");

const assertOwnInstituteOrSuperAdmin = (currentUser: AuthUser, instituteId: string): void => {
  if (isSuperAdmin(currentUser.roles)) return;
  if (instituteId !== currentUser.instituteId) {
    throw new AppError("Forbidden — cannot access another institute", 403);
  }
};

export const getAllInstitutes = async (currentUser: AuthUser) => {
  if (isSuperAdmin(currentUser.roles)) {
    return repo.findAllInstitutes();
  }

  const own = await repo.findInstituteById(currentUser.instituteId);
  return own ? [own] : [];
};

export const getInstituteById = async (id: string, currentUser: AuthUser) => {
  assertOwnInstituteOrSuperAdmin(currentUser, id);
  const institute = await repo.findInstituteById(id);
  if (!institute) throw new AppError("Institute not found", 404);
  return institute;
};

export const createInstitute = async (data: CreateInstituteDto, currentUser: AuthUser) => {
  if (!isSuperAdmin(currentUser.roles)) {
    throw new AppError("Forbidden — only SUPER_ADMIN can create institutes", 403);
  }
  return repo.createInstitute(data);
};

export const updateInstitute = async (
  id: string,
  data: UpdateInstituteDto,
  currentUser: AuthUser
) => {
  await getInstituteById(id, currentUser);
  return repo.updateInstitute(id, data);
};

export const deleteInstitute = async (id: string, currentUser: AuthUser) => {
  if (!isSuperAdmin(currentUser.roles)) {
    throw new AppError("Forbidden — only SUPER_ADMIN can delete institutes", 403);
  }
  await getInstituteById(id, currentUser);
  return repo.deleteInstitute(id);
};

export const getOrganization = async (currentUser: AuthUser) => {
  const institute = await repo.findInstituteById(currentUser.instituteId);
  if (!institute) throw new AppError("Institute not found", 404);
  return institute;
};

export const updateOrganization = async (
  currentUser: AuthUser,
  data: UpdateInstituteDto,
  auditMeta?: OrganizationAuditMeta
) => {
  const existing = await getOrganization(currentUser);
  const updated = await repo.updateInstitute(currentUser.instituteId, data);

  await createAuditLog({
    userId: currentUser.userId || currentUser.id,
    instituteId: currentUser.instituteId,
    branchId: currentUser.branchId,
    action: "ORGANIZATION_UPDATED",
    entityType: "Institute",
    entityId: currentUser.instituteId,
    oldData: existing,
    newData: updated,
    ipAddress: auditMeta?.ipAddress,
    userAgent: auditMeta?.userAgent,
  });

  return updated;
};
