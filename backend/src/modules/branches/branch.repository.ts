import { prisma } from "../../config/database";
import type { Status, Prisma } from "@prisma/client";

export const findBranches = async (params: {
  instituteId: string;
  branchId?: string;
  search?: string;
  status?: Status;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, search, status, skip, take } = params;

  const where: Prisma.BranchWhereInput = {
    instituteId,
    status: status ? status : { not: "DELETED" },
    ...(branchId && { id: branchId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [branches, total] = await prisma.$transaction([
    prisma.branch.findMany({
      where,
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
  });
};

export const findBranchByCode = async (code: string, instituteId: string) => {
  return prisma.branch.findFirst({
    where: { code, instituteId, status: { not: "DELETED" } },
  });
};

export const createBranch = async (data: {
  instituteId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
}) => {
  return prisma.branch.create({
    data: {
      instituteId: data.instituteId,
      name: data.name,
      code: data.code,
      address: data.address ?? null,
      phone: data.phone ?? null,
    },
  });
};

export const updateBranch = async (
  id: string,
  instituteId: string,
  data: {
    name?: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    status?: Status;
  }
) => {
  return prisma.branch.update({
    where: { id },
    data,
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
