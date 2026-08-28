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

/**
 * Check for duplicate name within the same entity type and institute
 */
export const findDuplicateMasterRecord = async (
  instituteId: string,
  entityType: string,
  name: string,
  excludeId?: string
) => {
  const where: Prisma.MasterRecordWhereInput = {
    instituteId,
    entityType,
    name: { equals: name, mode: "insensitive" },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  return prisma.masterRecord.findFirst({ where });
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

/**
 * Soft delete: set status to INACTIVE instead of removing the record
 */
export const softDeleteMasterRecord = async (id: string, instituteId: string) => {
  return prisma.masterRecord.update({
    where: { id },
    data: { status: "INACTIVE" },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
};

/**
 * Toggle status between ACTIVE and INACTIVE
 */
export const toggleMasterRecordStatus = async (id: string, newStatus: "ACTIVE" | "INACTIVE") => {
  return prisma.masterRecord.update({
    where: { id },
    data: { status: newStatus },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });
};

/**
 * Get counts for all entity types in one query (for the overview grid)
 */
export const findAllEntityTypeCounts = async (instituteId: string, branchId?: string) => {
  const where: Prisma.MasterRecordWhereInput = {
    instituteId,
    ...(branchId
      ? { OR: [{ branchId }, { branchId: null }] }
      : {}),
  };

  const counts = await prisma.masterRecord.groupBy({
    by: ["entityType"],
    where,
    _count: { id: true },
    _max: { updatedAt: true },
  });

  return counts.map((c) => ({
    entityType: c.entityType,
    count: c._count.id,
    lastUpdated: c._max.updatedAt ? c._max.updatedAt.toISOString() : null,
  }));
};

/**
 * Get only ACTIVE records for a given entity type (for dropdown consumption)
 */
export const findActiveMasterRecords = async (
  instituteId: string,
  entityType: string,
  branchId?: string
) => {
  const where: Prisma.MasterRecordWhereInput = {
    instituteId,
    entityType,
    status: "ACTIVE",
    ...(branchId
      ? { OR: [{ branchId }, { branchId: null }] }
      : {}),
  };

  return prisma.masterRecord.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      data: true,
      sortOrder: true,
    },
  });
};

export const findActiveNumberingSeriesByTarget = async (
  instituteId: string,
  target: string,
  excludeId?: string
) => {
  const normalizedTarget = target.toUpperCase();
  const baseWhere = {
    instituteId,
    entityType: "numberingseries",
    status: "ACTIVE" as const,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  const byCode = await prisma.masterRecord.findFirst({
    where: { ...baseWhere, code: normalizedTarget },
  });
  if (byCode) return byCode;

  return prisma.masterRecord.findFirst({
    where: {
      ...baseWhere,
      data: { path: ["target"], equals: normalizedTarget },
    },
  });
};
