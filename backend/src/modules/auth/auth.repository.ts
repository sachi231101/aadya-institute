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
  branchAccesses: { select: { branchId: true } },
};

export const findUserByEmailOrPhone = async (emailOrPhone: string) => {
  const trimmed = emailOrPhone.trim();

  // 1. Check if identifier matches a student's studentCode or admissionNo
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { studentCode: { equals: trimmed, mode: "insensitive" } },
        { admissions: { some: { admissionNo: { equals: trimmed, mode: "insensitive" } } } },
      ],
    },
    include: {
      user: {
        include: userInclude,
      },
    },
  });

  if (student?.user && student.user.status === "ACTIVE") {
    // Ensure STUDENT role is primary when logging in with student identifier
    const sortedRoles = [...(student.user.userRoles || [])].sort((a: any, b: any) => {
      if (a.role?.name === "STUDENT") return -1;
      if (b.role?.name === "STUDENT") return 1;
      return 0;
    });

    return {
      ...student.user,
      userRoles: sortedRoles,
      student: { id: student.id },
    };
  }

  // 2. Otherwise search user by email or phone
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { equals: trimmed, mode: "insensitive" } },
        { phone: trimmed },
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
