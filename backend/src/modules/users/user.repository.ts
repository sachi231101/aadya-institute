import { prisma } from "../../config/database";
import type { UserStatus, Prisma } from "@prisma/client";
import { resolvePermissionsToModules } from "../../utils/module-permissions";
import type { PermissionRoleScope } from "../../utils/permission-catalog";

// ─── Shared include shape ─────────────────────────────────────────────────────

const userInclude = {
  userRoles: {
    include: {
      role: true,
    },
  },
  branch: true,
  branchAccesses: {
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  },
  userPermissions: {
    include: {
      permission: true,
    },
  },
} satisfies Prisma.UserInclude;

// ─── Shape helpers ─────────────────────────────────────────────────────────────

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export const mapUserToResponse = (user: UserWithRoles) => {
  const permissionNames = (user.userPermissions ?? []).map(
    (up) => up.permission.name
  );

  const roles = user.userRoles.map((ur) => ur.role.name);
  const roleScope: PermissionRoleScope = roles.includes("COUNSELLOR")
    ? "COUNSELLOR"
    : "CENTER_MANAGER";

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    instituteId: user.instituteId,
    branchId: user.branchId,
    branch: user.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
    branchAccesses: (user.branchAccesses ?? []).map((ba) => ({
      id: ba.id,
      branchId: ba.branchId,
      branch: ba.branch
        ? { id: ba.branch.id, name: ba.branch.name, code: ba.branch.code }
        : null,
    })),
    whatsappEnabled: user.whatsappEnabled,
    roles,
    modulePermissions: resolvePermissionsToModules(permissionNames, roleScope),
    permissions: permissionNames,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Match users by primary branchId OR UserBranchAccess for the given scope.
 * Single branchId and multi branchIds follow the same OR pattern as leads.
 */
const userBranchScopeWhere = (
  branchId?: string,
  branchIds?: string[]
): Prisma.UserWhereInput | undefined => {
  if (branchId) {
    return {
      OR: [
        { branchId },
        { branchAccesses: { some: { branchId } } },
      ],
    };
  }
  if (branchIds && branchIds.length > 0) {
    return {
      OR: [
        { branchId: { in: branchIds } },
        { branchAccesses: { some: { branchId: { in: branchIds } } } },
      ],
    };
  }
  return undefined;
};

export const findUsers = async (params: {
  instituteId: string;
  branchId?: string;
  /** Multi-branch scope when getBranchScopeFilter returns branchIds. */
  branchIds?: string[];
  search?: string;
  role?: string;
  status?: UserStatus;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, branchIds, search, role, status, skip, take } =
    params;

  const branchScope = userBranchScopeWhere(branchId, branchIds);
  const andClauses: Prisma.UserWhereInput[] = [];
  if (branchScope) andClauses.push(branchScope);
  if (search) {
    andClauses.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    });
  }

  const where: Prisma.UserWhereInput = {
    instituteId,
    ...(status && { status }),
    ...(role && {
      userRoles: {
        some: {
          role: {
            name: {
              equals: role,
              mode: "insensitive",
            },
          },
        },
      },
    }),
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users.map(mapUserToResponse), total };
};

export const findUserById = async (id: string, instituteId: string) => {
  const user = await prisma.user.findFirst({
    where: { id, instituteId },
    include: userInclude,
  });
  return user ? mapUserToResponse(user) : null;
};

export const findUserByEmail = async (email: string, instituteId: string) => {
  return prisma.user.findFirst({
    where: { email, instituteId },
  });
};

export const findUserByPhone = async (phone: string, instituteId: string) => {
  return prisma.user.findFirst({
    where: { phone, instituteId },
  });
};

export const findRolesByNames = async (roleNames: string[]) => {
  return prisma.role.findMany({
    where: { name: { in: roleNames } },
  });
};

// ─── Permission queries ──────────────────────────────────────────────────────

/**
 * Find permission records by their names.
 */
export const findPermissionsByNames = async (names: string[]) => {
  if (names.length === 0) return [];
  return prisma.permission.findMany({
    where: { name: { in: names } },
  });
};

/** Create any missing Permission rows (used for catalog item.* flags). */
export const ensurePermissionsExist = async (
  names: Array<{ name: string; description: string }>
) => {
  if (names.length === 0) return;
  await prisma.permission.createMany({
    data: names,
    skipDuplicates: true,
  });
};

/**
 * Get all UserPermission records for a user (with permission names).
 */
export const findUserPermissions = async (userId: string) => {
  const records = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });
  return records.map((r) => r.permission.name);
};

/**
 * Set user permissions: delete all existing, then create new ones.
 */
export const setUserPermissions = async (
  userId: string,
  permissionIds: string[],
  grantedById?: string
) => {
  const uniqueIds = Array.from(new Set(permissionIds));
  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId } });
    if (uniqueIds.length === 0) return;
    await tx.userPermission.createMany({
      data: uniqueIds.map((permissionId) => ({
        userId,
        permissionId,
        grantedById,
      })),
      skipDuplicates: true,
    });
  });
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createUser = async (data: {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  passwordHash: string;
  instituteId: string;
  branchId?: string | null;
  roleIds: string[];
}) => {
  const { roleIds, ...rest } = data;

  const user = await prisma.user.create({
    data: {
      ...rest,
      userRoles: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    include: userInclude,
  });

  return mapUserToResponse(user);
};

export const updateUser = async (
  id: string,
  instituteId: string,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    branchId?: string | null;
    whatsappEnabled?: boolean;
  }
) => {
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.whatsappEnabled !== undefined && { whatsappEnabled: data.whatsappEnabled }),
    },
    include: userInclude,
  });
  return mapUserToResponse(user);
};

export const updateWhatsappPreference = async (id: string, whatsappEnabled: boolean) => {
  const user = await prisma.user.update({
    where: { id },
    data: { whatsappEnabled },
    include: userInclude,
  });
  return mapUserToResponse(user);
};

export const updateUserStatus = async (
  id: string,
  instituteId: string,
  status: UserStatus
) => {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
    include: userInclude,
  });
  return mapUserToResponse(user);
};

/**
 * Update password hash for a user in the same institute.
 * Returns true if a row was updated.
 */
export const updateUserPasswordHash = async (
  id: string,
  instituteId: string,
  passwordHash: string
): Promise<boolean> => {
  const result = await prisma.user.updateMany({
    where: { id, instituteId },
    data: { passwordHash },
  });
  return result.count > 0;
};

export const replaceUserBranchAccess = async (
  userId: string,
  instituteId: string,
  branchIds: string[]
) => {
  const uniqueIds = [...new Set(branchIds.filter(Boolean))];

  if (uniqueIds.length > 0) {
    const branches = await prisma.branch.findMany({
      where: { id: { in: uniqueIds }, instituteId },
      select: { id: true },
    });
    if (branches.length !== uniqueIds.length) {
      return null;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBranchAccess.deleteMany({ where: { userId } });
    if (uniqueIds.length > 0) {
      await tx.userBranchAccess.createMany({
        data: uniqueIds.map((branchId) => ({ userId, branchId })),
      });
    }

    // Keep User.branchId inside the allowed set so JWT primary + access stay aligned.
    const existing = await tx.user.findFirst({
      where: { id: userId, instituteId },
      select: { branchId: true },
    });
    if (!existing) return;

    let nextBranchId: string | null = null;
    if (uniqueIds.length > 0) {
      nextBranchId =
        existing.branchId && uniqueIds.includes(existing.branchId)
          ? existing.branchId
          : uniqueIds[0];
    }

    if (existing.branchId !== nextBranchId) {
      await tx.user.update({
        where: { id: userId },
        data: { branchId: nextBranchId },
      });
    }
  });

  return findUserById(userId, instituteId);
};

export const deleteUser = async (id: string, instituteId: string) => {
  // Soft-delete: block account, strip access, and release counsellor workload
  await prisma.$transaction([
    // Unassign CRM work so Overview KPIs / queues don't keep a deleted counsellor
    prisma.lead.updateMany({
      where: { assignedCounsellorId: id, instituteId },
      data: { assignedCounsellorId: null },
    }),
    prisma.leadAssignment.updateMany({
      where: { counsellorId: id, isCurrent: true },
      data: { isCurrent: false, unassignedAt: new Date() },
    }),
    prisma.leadFollowUp.updateMany({
      where: {
        counsellorId: id,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    }),
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userPermission.deleteMany({ where: { userId: id } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.user.update({
      where: { id },
      data: { status: "BLOCKED" },
    }),
  ]);
};

export const hardDeleteUser = async (id: string) => {
  await prisma.user.delete({ where: { id } });
};
