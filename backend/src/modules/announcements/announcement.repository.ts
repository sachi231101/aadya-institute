import { prisma } from "../../config/database";

export const AnnouncementRepository = {
  findMany(params: {
    instituteId: string;
    facultyId: string;
    batchId?: string;
    courseId?: string;
    search?: string;
    status?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      instituteId: params.instituteId,
      facultyId: params.facultyId,
      ...(params.batchId ? { batchId: params.batchId } : {}),
      ...(params.courseId ? { courseId: params.courseId } : {}),
      ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: "insensitive" as const } },
              { body: { contains: params.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    return Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        include: {
          batch: { select: { id: true, name: true, code: true } },
          course: { select: { id: true, name: true, code: true } },
          faculty: {
            select: {
              id: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]).then(([total, data]) => ({ total, data }));
  },

  findById(id: string, instituteId: string) {
    return prisma.announcement.findFirst({
      where: { id, instituteId },
      include: {
        batch: { select: { id: true, name: true, code: true } },
        course: { select: { id: true, name: true, code: true } },
      },
    });
  },

  create(data: {
    instituteId: string;
    facultyId: string;
    batchId?: string | null;
    courseId?: string | null;
    title: string;
    body: string;
    type: string;
    status: string;
  }) {
    return prisma.announcement.create({
      data: {
        instituteId: data.instituteId,
        facultyId: data.facultyId,
        batchId: data.batchId ?? null,
        courseId: data.courseId ?? null,
        title: data.title,
        body: data.body,
        type: data.type,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : new Date(),
      },
      include: {
        batch: { select: { id: true, name: true, code: true } },
        course: { select: { id: true, name: true, code: true } },
      },
    });
  },

  delete(id: string, instituteId: string, facultyId: string) {
    return prisma.announcement.deleteMany({
      where: { id, instituteId, facultyId },
    });
  },
};
