import { prisma } from "../../config/database";

const userInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
  userPermissions: {
    include: {
      permission: true,
    },
  },
  student: { select: { id: true } },
  faculty: { select: { id: true } },
};

export const findUserByEmailOrPhone = async (emailOrPhone: string) => {
  // Duplicate emails can exist across re-seeds; prefer a profile-linked account.
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
      ],
      status: "ACTIVE",
    },
    include: userInclude,
    orderBy: { updatedAt: "desc" },
  });

  if (users.length === 0) return null;

  const withProfile = users.find((u) => u.student != null || u.faculty != null);
  return withProfile ?? users[0];
};

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    include: userInclude,
  });
};
