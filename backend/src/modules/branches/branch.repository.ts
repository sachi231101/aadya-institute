import { prisma } from "../../config/database";
import { Prisma, type Status } from "@prisma/client";

const managerSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const branchInclude = {
  manager: { select: managerSelect },
} as const;

export const findBranches = async (params: {
  instituteId: string;
  branchId?: string;
  /** IN filter for multi-branch access (UserBranchAccess). Prefer over branchId when listing. */
  branchIds?: string[];
  search?: string;
  status?: Status;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, branchIds, search, status, skip, take } = params;

  const where: Prisma.BranchWhereInput = {
    instituteId,
    status: status ? status : { not: "DELETED" },
    ...(branchId
      ? { id: branchId }
      : branchIds && branchIds.length > 0
        ? { id: { in: branchIds } }
        : {}),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [branches, total] = await prisma.$transaction([
    prisma.branch.findMany({
      where,
      include: branchInclude,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.branch.count({ where }),
  ]);

  return { branches, total };
};

export const findBranchById = async (id: string, instituteId: string) => {
  return prisma.branch.findFirst({
    where: { id, instituteId, status: { not: "DELETED" } },
    include: branchInclude,
  });
};

export const findBranchByCode = async (code: string, instituteId: string) => {
  return prisma.branch.findFirst({
    where: { code, instituteId, status: { not: "DELETED" } },
  });
};

export const findManagerCandidate = async (
  userId: string,
  instituteId: string
) => {
  return prisma.user.findFirst({
    where: {
      id: userId,
      instituteId,
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true, instituteId: true },
  });
};

export const createBranch = async (data: {
  instituteId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  workingHours?: Prisma.InputJsonValue | null;
  managerUserId?: string | null;
}) => {
  return prisma.branch.create({
    data: {
      instituteId: data.instituteId,
      name: data.name,
      code: data.code,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      timezone: data.timezone ?? "Asia/Kolkata",
      ...(data.workingHours !== undefined && data.workingHours !== null
        ? { workingHours: data.workingHours }
        : {}),
      managerUserId: data.managerUserId ?? null,
    },
    include: branchInclude,
  });
};

export const updateBranch = async (
  id: string,
  _instituteId: string,
  data: {
    name?: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    timezone?: string | null;
    workingHours?: Prisma.InputJsonValue | null;
    managerUserId?: string | null;
    status?: Status;
  }
) => {
  const updateData: Prisma.BranchUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.workingHours !== undefined) {
    updateData.workingHours =
      data.workingHours === null ? Prisma.JsonNull : data.workingHours;
  }
  if (data.managerUserId !== undefined) {
    updateData.manager =
      data.managerUserId === null
        ? { disconnect: true }
        : { connect: { id: data.managerUserId } };
  }

  return prisma.branch.update({
    where: { id },
    data: updateData,
    include: branchInclude,
  });
};

export const getBranchStats = async (branchId: string, instituteId: string) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const upcomingEnd = new Date(todayEnd);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  const sessionWhere = {
    branchId,
    status: "ACTIVE" as const,
    batch: { instituteId },
  };

  const [totalStudents, totalFaculty, totalBatches, totalAdmissions, todayClasses, upcomingClasses, liveClasses] =
    await prisma.$transaction([
      prisma.student.count({ where: { branchId, instituteId } }),
      prisma.faculty.count({ where: { branchId, instituteId } }),
      prisma.batch.count({ where: { branchId, instituteId } }),
      prisma.admission.count({ where: { branchId, instituteId } }),
      prisma.classSession.count({
        where: { ...sessionWhere, scheduledDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.classSession.count({
        where: {
          ...sessionWhere,
          scheduledDate: { gt: todayEnd, lte: upcomingEnd },
          sessionStatus: "UPCOMING",
        },
      }),
      prisma.classSession.count({
        where: { ...sessionWhere, sessionStatus: "LIVE" },
      }),
    ]);

  return {
    totalStudents,
    totalFaculty,
    totalBatches,
    totalAdmissions,
    todayClasses,
    upcomingClasses,
    liveClasses,
  };
};
