import { prisma } from "../../config/database";

export interface FindAllFacultyParams {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: string;
  skip: number;
  take: number;
}

// Shared include for consistent Faculty + User data
const facultyInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

/**
 * Build a reusable where-clause for list + count queries.
 */
const buildWhereClause = (params: Omit<FindAllFacultyParams, "skip" | "take">) => {
  const where: Record<string, unknown> = {
    instituteId: params.instituteId,
  };

  if (params.branchId) {
    where.branchId = params.branchId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.search) {
    where.OR = [
      { employeeCode: { contains: params.search } },
      { specialization: { contains: params.search } },
      { user: { name: { contains: params.search } } },
      { user: { email: { contains: params.search } } },
      { user: { phone: { contains: params.search } } },
    ];
  }

  return where;
};

export const findAllFaculty = (params: FindAllFacultyParams) => {
  const where = buildWhereClause(params);
  return prisma.faculty.findMany({
    where,
    include: facultyInclude,
    orderBy: { createdAt: "desc" },
    skip: params.skip,
    take: params.take,
  });
};

export const countFaculty = (params: Omit<FindAllFacultyParams, "skip" | "take">) => {
  const where = buildWhereClause(params);
  return prisma.faculty.count({ where });
};

export const findFacultyById = (id: string) =>
  prisma.faculty.findUnique({
    where: { id },
    include: facultyInclude,
  });

export const findFacultyByEmployeeCode = (instituteId: string, employeeCode: string) =>
  prisma.faculty.findUnique({
    where: {
      instituteId_employeeCode: { instituteId, employeeCode },
    },
  });

/**
 * Creates User + Faculty + assigns FACULTY role in a single transaction.
 */
export const createFacultyWithUser = async (data: {
  instituteId: string;
  branchId: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  employeeCode: string;
  specialization?: string;
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the User record
    const user = await tx.user.create({
      data: {
        instituteId: data.instituteId,
        branchId: data.branchId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
      },
    });

    // 2. Create the Faculty record linked to the User
    const faculty = await tx.faculty.create({
      data: {
        userId: user.id,
        instituteId: data.instituteId,
        branchId: data.branchId,
        employeeCode: data.employeeCode,
        specialization: data.specialization,
      },
      include: facultyInclude,
    });

    // 3. Find the FACULTY role and assign it
    const facultyRole = await tx.role.findUnique({
      where: { name: "FACULTY" },
    });

    if (facultyRole) {
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: facultyRole.id,
        },
      });
    }

    return faculty;
  });
};

/**
 * Updates Faculty fields and optionally the related User fields (name, email, phone).
 */
export const updateFaculty = async (
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    specialization?: string;
    status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  }
) => {
  const { name, email, phone, specialization, status } = data;

  // If user-level fields are provided, update both User and Faculty
  const hasUserUpdates = name !== undefined || email !== undefined || phone !== undefined;

  // Build faculty-only update data
  const facultyUpdate: { specialization?: string; status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE" } = {};
  if (specialization !== undefined) facultyUpdate.specialization = specialization;
  if (status !== undefined) facultyUpdate.status = status;

  if (hasUserUpdates) {
    // Get Faculty to find the userId
    const existing = await prisma.faculty.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.$transaction(async (tx) => {
      // Update User fields
      const userUpdate: Record<string, unknown> = {};
      if (name !== undefined) userUpdate.name = name;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;

      await tx.user.update({
        where: { id: existing.userId },
        data: userUpdate,
      });

      // Update Faculty fields
      return tx.faculty.update({
        where: { id },
        data: facultyUpdate,
        include: facultyInclude,
      });
    });
  }

  // Only Faculty-level fields
  return prisma.faculty.update({
    where: { id },
    data: facultyUpdate,
    include: facultyInclude,
  });
};

/**
 * Soft-delete: sets Faculty status to INACTIVE and User status to INACTIVE.
 */
export const softDeleteFaculty = async (id: string) => {
  const existing = await prisma.faculty.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: { status: "INACTIVE" },
    });

    return tx.faculty.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: facultyInclude,
    });
  });
};
