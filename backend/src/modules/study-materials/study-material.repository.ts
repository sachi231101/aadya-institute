import { prisma } from "../../config/database";

export const StudyMaterialRepository = {
  findMany(params: {
    instituteId: string;
    facultyId: string;
    batchId?: string;
    classSessionId?: string;
    search?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      instituteId: params.instituteId,
      facultyId: params.facultyId,
      ...(params.batchId ? { batchId: params.batchId } : {}),
      ...(params.classSessionId ? { classSessionId: params.classSessionId } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" as const } },
              { description: { contains: params.search, mode: "insensitive" as const } },
              { fileName: { contains: params.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    return Promise.all([
      prisma.studyMaterial.count({ where }),
      prisma.studyMaterial.findMany({
        where,
        include: {
          batch: { select: { id: true, name: true, code: true } },
          classSession: {
            select: {
              id: true,
              title: true,
              scheduledDate: true,
              batch: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]).then(([total, data]) => ({ total, data }));
  },

  findById(id: string, instituteId: string) {
    return prisma.studyMaterial.findFirst({
      where: { id, instituteId },
      include: {
        batch: { select: { id: true, name: true, code: true } },
        classSession: {
          select: {
            id: true,
            title: true,
            facultyId: true,
            batchId: true,
            scheduledDate: true,
          },
        },
      },
    });
  },

  create(data: {
    instituteId: string;
    facultyId: string;
    batchId?: string | null;
    classSessionId?: string | null;
    title: string;
    description?: string | null;
    fileType: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    mimeType?: string | null;
  }) {
    return prisma.studyMaterial.create({
      data: {
        instituteId: data.instituteId,
        facultyId: data.facultyId,
        batchId: data.batchId ?? null,
        classSessionId: data.classSessionId ?? null,
        title: data.title,
        description: data.description ?? null,
        fileType: data.fileType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
      },
      include: {
        batch: { select: { id: true, name: true, code: true } },
        classSession: {
          select: { id: true, title: true, scheduledDate: true },
        },
      },
    });
  },

  delete(id: string, instituteId: string, facultyId: string) {
    return prisma.studyMaterial.deleteMany({
      where: { id, instituteId, facultyId },
    });
  },
};
