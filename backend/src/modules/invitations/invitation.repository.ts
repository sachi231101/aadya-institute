import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import type { InvitationStatus, Prisma } from "@prisma/client";

const invitationSelect = {
  id: true,
  instituteId: true,
  branchId: true,
  email: true,
  phone: true,
  name: true,
  roleName: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  invitedById: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, code: true } },
  invitedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.UserInvitationSelect;

export type InvitationSafe = Prisma.UserInvitationGetPayload<{
  select: typeof invitationSelect;
}>;

export const createInvitation = async (data: {
  instituteId: string;
  branchId?: string | null;
  email: string;
  phone?: string | null;
  name: string;
  roleName: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
}) => {
  return prisma.userInvitation.create({
    data: {
      instituteId: data.instituteId,
      branchId: data.branchId ?? null,
      email: data.email,
      phone: data.phone ?? null,
      name: data.name,
      roleName: data.roleName,
      tokenHash: data.tokenHash,
      status: "PENDING",
      expiresAt: data.expiresAt,
      invitedById: data.invitedById,
    },
    select: invitationSelect,
  });
};

export const findPendingInvitations = async (params: {
  instituteId: string;
  search?: string;
  skip: number;
  take: number;
}) => {
  const { instituteId, search, skip, take } = params;

  const where: Prisma.UserInvitationWhereInput = {
    instituteId,
    status: "PENDING",
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [invitations, total] = await prisma.$transaction([
    prisma.userInvitation.findMany({
      where,
      select: invitationSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.userInvitation.count({ where }),
  ]);

  return { invitations, total };
};

export const findInvitationById = async (id: string, instituteId: string) => {
  return prisma.userInvitation.findFirst({
    where: { id, instituteId },
    select: invitationSelect,
  });
};

export const findInvitationByTokenHash = async (tokenHash: string) => {
  return prisma.userInvitation.findUnique({
    where: { tokenHash },
    select: {
      ...invitationSelect,
      tokenHash: true,
    },
  });
};

export const updateInvitationStatus = async (
  id: string,
  status: InvitationStatus,
  extra?: { acceptedAt?: Date }
) => {
  return prisma.userInvitation.update({
    where: { id },
    data: {
      status,
      ...(extra?.acceptedAt ? { acceptedAt: extra.acceptedAt } : {}),
    },
    select: invitationSelect,
  });
};

export const findRoleByName = async (roleName: string) => {
  return prisma.role.findFirst({
    where: { name: { equals: roleName, mode: "insensitive" } },
  });
};

export const findBranchesInInstitute = async (
  instituteId: string,
  branchIds: string[]
) => {
  if (branchIds.length === 0) return [];
  return prisma.branch.findMany({
    where: { id: { in: branchIds }, instituteId },
    select: { id: true },
  });
};

export const findUserByEmailInInstitute = async (
  email: string,
  instituteId: string
) => {
  return prisma.user.findFirst({
    where: { email, instituteId },
    select: { id: true },
  });
};

export const findPendingInviteByEmail = async (
  email: string,
  instituteId: string
) => {
  return prisma.userInvitation.findFirst({
    where: { email, instituteId, status: "PENDING" },
    select: { id: true },
  });
};

export const acceptInvitationTransaction = async (params: {
  invitationId: string;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  instituteId: string;
  branchId?: string | null;
  roleId: string;
  roleName: string;
  branchAccessIds: string[];
  facultyEmployeeCode?: string;
}) => {
  const {
    invitationId,
    name,
    email,
    phone,
    passwordHash,
    instituteId,
    branchId,
    roleId,
    roleName,
    branchAccessIds,
    facultyEmployeeCode,
  } = params;

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.userInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.status !== "PENDING") {
      return null;
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await tx.userInvitation.update({
        where: { id: invitationId },
        data: { status: "EXPIRED" },
      });
      return null;
    }

    if (roleName === "FACULTY") {
      if (!branchId) {
        throw new AppError(
          "Branch is required when accepting a Faculty invitation",
          400
        );
      }
      if (!facultyEmployeeCode) {
        throw new AppError(
          "Employee code is required when accepting a Faculty invitation",
          400
        );
      }
    }

    const user = await tx.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        passwordHash,
        status: "ACTIVE",
        instituteId,
        branchId: branchId ?? null,
        userRoles: {
          create: [{ roleId }],
        },
        ...(branchAccessIds.length > 0
          ? {
              branchAccesses: {
                create: branchAccessIds.map((bId) => ({ branchId: bId })),
              },
            }
          : {}),
      },
      include: {
        userRoles: { include: { role: true } },
        branch: true,
        branchAccesses: { include: { branch: true } },
      },
    });

    if (roleName === "FACULTY" && branchId && facultyEmployeeCode) {
      await tx.faculty.create({
        data: {
          userId: user.id,
          instituteId,
          branchId,
          employeeCode: facultyEmployeeCode,
        },
      });
    }

    await tx.userInvitation.update({
      where: { id: invitationId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return user;
  });
};

/**
 * Resolve branch access IDs for an invitation.
 * Prefer Redis (set at create), then USER_INVITED audit newData.branchIds,
 * then invitation.branchId.
 */
export const loadInviteBranchIds = async (
  invitationId: string,
  fallbackBranchId?: string | null
): Promise<string[]> => {
  try {
    const { getRedis } = await import("../../config/redis");
    const redis = getRedis();
    if (redis && redis.status === "ready") {
      const raw = await redis.get(`aadya:invite-branches:${invitationId}`);
      if (raw) {
        await redis.del(`aadya:invite-branches:${invitationId}`);
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...new Set(parsed.filter(Boolean))];
        }
      }
    }
  } catch {
    // fall through
  }

  try {
    const log = await prisma.activityLog.findFirst({
      where: {
        entityType: "UserInvitation",
        entityId: invitationId,
        action: "USER_INVITED",
      },
      orderBy: { createdAt: "desc" },
      select: { newData: true },
    });
    const data = log?.newData as { branchIds?: string[] } | null;
    if (Array.isArray(data?.branchIds) && data.branchIds.length > 0) {
      return [...new Set(data.branchIds.filter(Boolean))];
    }
  } catch {
    // fall through
  }

  return fallbackBranchId ? [fallbackBranchId] : [];
};

/** Temporary multi-branch cache (schema has single branchId). */
export const storeInviteBranchIds = async (
  invitationId: string,
  branchIds: string[]
): Promise<void> => {
  if (branchIds.length <= 1) return;
  try {
    const { getRedis } = await import("../../config/redis");
    const redis = getRedis();
    if (!redis || redis.status !== "ready") return;
    await redis.set(
      `aadya:invite-branches:${invitationId}`,
      JSON.stringify(branchIds),
      "EX",
      7 * 24 * 60 * 60
    );
  } catch {
    // Non-critical — accept falls back to audit log / branchId
  }
};
