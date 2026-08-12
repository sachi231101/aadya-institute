import { prisma } from "../../config/database";
import type { UserStatus, Prisma } from "@prisma/client";

// ─── Shared include shape ─────────────────────────────────────────────────────

const userInclude = {
  userRoles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.UserInclude;

// ─── Shape helpers ─────────────────────────────────────────────────────────────

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export const mapUserToResponse = (user: UserWithRoles) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  status: user.status,
  instituteId: user.instituteId,
  branchId: user.branchId,
  roles: user.userRoles.map((ur) => ur.role.name),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

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
        some: { role: { name: role } },
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
  }
) => {
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
    },
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
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.user.update({
      where: { id },
      data: { status: "BLOCKED" },
    }),
  ]);
};
