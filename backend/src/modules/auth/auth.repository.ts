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
};

export const findUserByEmailOrPhone = async (emailOrPhone: string) => {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
      ],
      status: "ACTIVE",
    },
    include: userInclude,
  });
};

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    include: userInclude,
  });
};
