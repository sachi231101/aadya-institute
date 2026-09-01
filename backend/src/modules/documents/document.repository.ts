import { prisma } from "../../config/database";
import type { Prisma, DocumentEntity, DocumentStatus } from "@prisma/client";

const documentInclude = {
  branch: { select: { id: true, name: true, code: true } },
  uploadedBy: { select: { id: true, name: true, email: true } },
  verifiedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.DocumentInclude;

export const DocumentRepository = {
  async findMany(params: {
    instituteId: string;
    branchId?: string;
    entityType?: DocumentEntity;
    entityId?: string;
    status?: DocumentStatus;
    search?: string;
    skip: number;
    take: number;
  }) {
    const { instituteId, branchId, entityType, entityId, status, search, skip, take } = params;

    const where: Prisma.DocumentWhereInput = {
      instituteId,
      ...(branchId ? { branchId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { fileName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        include: documentInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return { total, data };
  },

  async findById(id: string, instituteId: string) {
    return prisma.document.findFirst({
      where: { id, instituteId },
      include: documentInclude,
    });
  },

  async create(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({
      data,
      include: documentInclude,
    });
  },

  async update(id: string, instituteId: string, data: Prisma.DocumentUpdateInput) {
    await prisma.document.updateMany({ where: { id, instituteId }, data });
    return DocumentRepository.findById(id, instituteId);
  },

  async delete(id: string, instituteId: string) {
    return prisma.document.deleteMany({ where: { id, instituteId } });
  },
};
