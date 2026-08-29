import { prisma } from "../../config/database";

export const findFeedbackList = async (params: {
  instituteId: string;
  classSessionId?: string;
  studentId?: string;
  facultyId?: string;
  skip: number;
  take: number;
}) => {
  const where: Record<string, unknown> = {
    student: { instituteId: params.instituteId },
  };
  if (params.classSessionId) where.classSessionId = params.classSessionId;
  if (params.studentId) where.studentId = params.studentId;
  if (params.facultyId) where.facultyId = params.facultyId;

  const [records, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { submittedAt: "desc" },
      include: {
        classSession: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            batch: { select: { id: true, name: true, code: true } },
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return { records, total };
};

export const createFeedback = async (data: {
  classSessionId: string;
  studentId: string;
  facultyId: string;
  rating: number;
  comment?: string;
}) => {
  return prisma.feedback.upsert({
    where: {
      classSessionId_studentId: {
        classSessionId: data.classSessionId,
        studentId: data.studentId,
      },
    },
    create: {
      classSessionId: data.classSessionId,
      studentId: data.studentId,
      facultyId: data.facultyId,
      rating: data.rating,
      comment: data.comment,
    },
    update: {
      rating: data.rating,
      comment: data.comment,
      facultyId: data.facultyId,
      submittedAt: new Date(),
    },
    include: {
      classSession: {
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });
};

export const findFacultyRatings = async (params: {
  instituteId: string;
  facultyId?: string;
  batchId?: string;
  branchId?: string;
}) => {
  const where: Record<string, unknown> = {
    student: { instituteId: params.instituteId },
  };
  if (params.facultyId) where.facultyId = params.facultyId;
  if (params.batchId) {
    where.classSession = { batchId: params.batchId };
  }
  if (params.branchId) {
    where.faculty = {
      ...(typeof where.faculty === "object" && where.faculty ? (where.faculty as object) : {}),
      branchId: params.branchId,
      instituteId: params.instituteId,
    };
  }

  const rows = await prisma.feedback.groupBy({
    by: ["facultyId", "rating"],
    where,
    _count: { rating: true },
  });

  const facultyIds = [...new Set(rows.map((r) => r.facultyId))];
  const faculties = await prisma.faculty.findMany({
    where: {
      id: { in: facultyIds },
      instituteId: params.instituteId,
      ...(params.branchId ? { branchId: params.branchId } : {}),
    },
    include: { user: { select: { name: true } }, branch: { select: { id: true, name: true } } },
  });
  const nameById = new Map(faculties.map((f) => [f.id, f.user?.name ?? f.employeeCode]));
  const branchById = new Map(faculties.map((f) => [f.id, f.branch?.name ?? null]));

  const byFaculty = new Map<
    string,
    {
      facultyId: string;
      facultyName: string;
      branchName: string | null;
      total: number;
      sum: number;
      ratings: Record<number, number>;
    }
  >();

  for (const row of rows) {
    if (!nameById.has(row.facultyId)) continue;
    const current = byFaculty.get(row.facultyId) ?? {
      facultyId: row.facultyId,
      facultyName: nameById.get(row.facultyId) ?? "Faculty",
      branchName: branchById.get(row.facultyId) ?? null,
      total: 0,
      sum: 0,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    const count = row._count.rating;
    current.total += count;
    current.sum += row.rating * count;
    current.ratings[row.rating] = (current.ratings[row.rating] || 0) + count;
    byFaculty.set(row.facultyId, current);
  }

  return Array.from(byFaculty.values()).map((f) => ({
    facultyId: f.facultyId,
    facultyName: f.facultyName,
    branchName: f.branchName,
    averageRating: f.total > 0 ? Math.round((f.sum / f.total) * 100) / 100 : 0,
    totalFeedbacks: f.total,
    ratings: [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: f.ratings[rating] || 0,
    })),
  }));
};
