import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

const announcementInclude = (readerUserId: string) => ({
  batch: {
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  },
  course: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  faculty: {
    select: {
      id: true,
      designation: true,
      user: { select: { id: true, name: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
  reads: { where: { userId: readerUserId }, select: { readAt: true }, take: 1 },
  _count: { select: { reads: true } },
});

export const AnnouncementRepository = {
  findMany(params: {
    where: Prisma.AnnouncementWhereInput;
    skip: number;
    take: number;
    readerUserId?: string;
  }) {
    return Promise.all([
      prisma.announcement.count({ where: params.where }),
      prisma.announcement.findMany({
        where: params.where,
        include: announcementInclude(params.readerUserId || ""),
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
    facultyId?: string | null;
    createdById: string;
    authorRole: string;
    targetRole: string;
    branchId?: string | null;
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
        facultyId: data.facultyId ?? null,
        createdById: data.createdById,
        authorRole: data.authorRole,
        targetRole: data.targetRole,
        branchId: data.branchId ?? null,
        batchId: data.batchId ?? null,
        courseId: data.courseId ?? null,
        title: data.title,
        body: data.body,
        type: data.type,
        status: data.status,
        publishedAt: new Date(),
      },
      include: announcementInclude(data.createdById),
    });
  },

  delete(id: string, instituteId: string) {
    return prisma.announcement.deleteMany({
      where: { id, instituteId },
    });
  },

  markRead(announcementId: string, userId: string) {
    return prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: {},
      create: { announcementId, userId },
    });
  },

  markAllRead(announcementIds: string[], userId: string) {
    if (announcementIds.length === 0) return Promise.resolve({ count: 0 });
    return prisma.announcementRead.createMany({
      data: announcementIds.map((announcementId) => ({ announcementId, userId })),
      skipDuplicates: true,
    });
  },
};
