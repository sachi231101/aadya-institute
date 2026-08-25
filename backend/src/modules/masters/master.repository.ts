import { prisma } from "../../config/database";
import type { Prisma, Status } from "@prisma/client";
import type { CreateMasterRecordInput, UpdateMasterRecordInput } from "./master.types";

export interface FindMasterRecordsParams {
  instituteId: string;
  entityType?: string;
  branchId?: string;
  search?: string;
  status?: Status;
  skip?: number;
  take?: number;
}

export const findMasterRecords = async (params: FindMasterRecordsParams) => {
  const { instituteId, entityType, branchId, search, status, skip = 0, take = 50 } = params;

  const where: Prisma.MasterRecordWhereInput = {
    instituteId,
    ...(entityType ? { entityType } : {}),
    ...(status ? { status } : {}),
    ...(branchId
      ? {
          OR: [{ branchId }, { branchId: null }],
        }
      : {}),
  };

  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.masterRecord.findMany({
      where,
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.masterRecord.count({ where }),
  ]);

  return { records, total };
};

export const findMasterRecordById = async (id: string, instituteId: string) => {
  return prisma.masterRecord.findFirst({
    where: { id, instituteId },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
};

export const createMasterRecord = async (
  instituteId: string,
  input: CreateMasterRecordInput
) => {
  return prisma.masterRecord.create({
    data: {
      instituteId,
      entityType: input.entityType,
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      branchId: input.branchId ?? null,
      status: input.status ?? "ACTIVE",
      sortOrder: input.sortOrder ?? 0,
      data: input.data ?? undefined,
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
};

export const updateMasterRecord = async (
  id: string,
  instituteId: string,
  input: UpdateMasterRecordInput
) => {
  return prisma.masterRecord.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.data !== undefined ? { data: input.data } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
};

export const deleteMasterRecord = async (id: string, instituteId: string) => {
  return prisma.masterRecord.delete({
    where: { id },
  });
};
