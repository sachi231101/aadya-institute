import { prisma } from "../../config/database";

export const findUserByEmailOrPhone = async (emailOrPhone: string) => {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
      ],
      status: "ACTIVE",
    },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
};

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId, status: "ACTIVE" },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
};
