import { prisma } from "../../config/database";
import type { UserStatus, Prisma } from "@prisma/client";
import { resolvePermissionsToModules } from "../../utils/module-permissions";

// ─── Shared include shape ─────────────────────────────────────────────────────

const userInclude = {
  userRoles: {
    include: {
      role: true,
    },
  },
  branch: true,
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

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    instituteId: user.instituteId,
    branchId: user.branchId,
    branch: user.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
    whatsappEnabled: user.whatsappEnabled,
    roles: user.userRoles.map((ur) => ur.role.name),
    modulePermissions: resolvePermissionsToModules(permissionNames),
    permissions: permissionNames,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const findUsers = async (params: {
  instituteId: string;
  branchId?: string;
  search?: string;
  role?: string;
  status?: UserStatus;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, search, role, status, skip, take } = params;

  const where: Prisma.UserWhereInput = {
    instituteId,
    ...(branchId && { branchId }),
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
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    }),
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
  return prisma.permission.findMany({
    where: { name: { in: names } },
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
  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId } }),
    ...permissionIds.map((permissionId) =>
      prisma.userPermission.create({
        data: { userId, permissionId, grantedById },
      })
    ),
  ]);
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

export const deleteUser = async (id: string, instituteId: string) => {
  // Soft-delete: set status to BLOCKED and remove role assignments
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userPermission.deleteMany({ where: { userId: id } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.user.update({
      where: { id },
      data: { status: "BLOCKED" },
    }),
  ]);
};
