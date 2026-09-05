import { prisma } from "../../config/database";
import type { Prisma, AssignmentSubmissionStatus } from "@prisma/client";
import type { AssignmentTargetDTO } from "./assignment.types";

const submissionSelect = {
  id: true,
  studentId: true,
  status: true,
  submissionStatus: true,
  marks: true,
  feedback: true,
  notes: true,
  submittedAt: true,
  evaluatedAt: true,
  evaluatedBy: true,
  fileKey: true,
  fileName: true,
  student: {
    select: {
      id: true,
      studentCode: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.AssignmentSubmissionSelect;

const targetInclude = {
  course: { select: { id: true, name: true, code: true } },
  courseModule: { select: { id: true, name: true, code: true, topics: true } },
  batch: { select: { id: true, name: true, code: true, courseId: true } },
} satisfies Prisma.AssignmentTargetInclude;

const assignmentInclude = {
  classSession: {
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      startTime: true,
      endTime: true,
      batch: { select: { id: true, name: true, instituteId: true, branchId: true } },
    },
  },
  batch: {
    select: {
      id: true,
      name: true,
      code: true,
      instituteId: true,
      branchId: true,
      facultyId: true,
      course: { select: { id: true, name: true, code: true } },
    },
  },
  faculty: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  assignmentTypeMaster: { select: { id: true, name: true, code: true } },
  academicYearMaster: { select: { id: true, name: true, code: true } },
  targets: { include: targetInclude },
  recipients: {
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
  submissions: { select: submissionSelect },
  _count: { select: { submissions: true, targets: true, recipients: true } },
} satisfies Prisma.AssignmentInclude;

export const createAssignment = async (data: {
  classSessionId?: string | null;
  batchId: string;
  facultyId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  assignedAt?: Date;
  validTill?: Date | null;
  maxMarks?: number;
  allowLate?: boolean;
  restrictStudentUpload?: boolean;
  youtubeVideoId?: string | null;
  assignmentTypeMasterId?: string | null;
  academicYearMasterId?: string | null;
  targets: AssignmentTargetDTO[];
  recipientStudentIds?: string[];
  pendingStudentIds?: string[];
}) => {
  const { pendingStudentIds, targets, recipientStudentIds, ...assignmentData } = data;

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({
      data: {
        classSessionId: assignmentData.classSessionId || undefined,
        batchId: assignmentData.batchId,
        facultyId: assignmentData.facultyId,
        title: assignmentData.title,
        description: assignmentData.description,
        dueDate: assignmentData.dueDate,
        assignedAt: assignmentData.assignedAt ?? new Date(),
        validTill: assignmentData.validTill ?? undefined,
        maxMarks: assignmentData.maxMarks ?? 100,
        allowLate: assignmentData.allowLate ?? false,
        restrictStudentUpload: assignmentData.restrictStudentUpload ?? false,
        youtubeVideoId: assignmentData.youtubeVideoId || undefined,
        assignmentTypeMasterId: assignmentData.assignmentTypeMasterId || undefined,
        academicYearMasterId: assignmentData.academicYearMasterId || undefined,
        targets: {
          create: targets.map((t) => ({
            courseId: t.courseId,
            courseModuleId: t.courseModuleId || undefined,
            topic: t.topic || undefined,
            batchId: t.batchId,
          })),
        },
        ...(recipientStudentIds && recipientStudentIds.length > 0
          ? {
              recipients: {
                create: recipientStudentIds.map((studentId) => ({ studentId })),
              },
            }
          : {}),
      },
    });

    if (pendingStudentIds && pendingStudentIds.length > 0) {
      await tx.assignmentSubmission.createMany({
        data: pendingStudentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
          submissionStatus: "PENDING" as AssignmentSubmissionStatus,
        })),
        skipDuplicates: true,
      });
    }

    return tx.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: assignmentInclude,
    });
  });
};

export const findAssignments = async (params: {
  instituteId: string;
  branchId?: string;
  batchId?: string;
  batchIds?: string[];
  /** When set, only batch-wide (no recipients) or explicitly assigned to this student */
  forStudentId?: string;
  classSessionId?: string;
  facultyId?: string;
  status?: string;
  search?: string;
  assignedFrom?: Date;
  assignedTo?: Date;
  academicYearMasterId?: string;
  assignmentTypeMasterId?: string;
  skip: number;
  take: number;
}) => {
  const {
    instituteId,
    branchId,
    batchId,
    batchIds,
    forStudentId,
    classSessionId,
    facultyId,
    status,
    search,
    assignedFrom,
    assignedTo,
    academicYearMasterId,
    assignmentTypeMasterId,
    skip,
    take,
  } = params;

  const where: Prisma.AssignmentWhereInput = {
    batch: {
      instituteId,
      ...(branchId ? { branchId } : {}),
    },
    ...(batchIds && batchIds.length > 0
      ? {
          OR: [
            { batchId: { in: batchIds } },
            { targets: { some: { batchId: { in: batchIds } } } },
          ],
        }
      : batchId
        ? {
            OR: [{ batchId }, { targets: { some: { batchId } } }],
          }
        : {}),
    ...(forStudentId
      ? {
          AND: [
            {
              OR: [
                { recipients: { none: {} } },
                { recipients: { some: { studentId: forStudentId } } },
              ],
            },
          ],
        }
      : {}),
    ...(classSessionId ? { classSessionId } : {}),
    ...(facultyId ? { facultyId } : {}),
    ...(status ? { status: status as Prisma.EnumStatusFilter["equals"] } : {}),
    ...(academicYearMasterId ? { academicYearMasterId } : {}),
    ...(assignmentTypeMasterId ? { assignmentTypeMasterId } : {}),
    ...(assignedFrom || assignedTo
      ? {
          assignedAt: {
            ...(assignedFrom ? { gte: assignedFrom } : {}),
            ...(assignedTo ? { lte: assignedTo } : {}),
          },
        }
      : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: [{ assignedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.assignment.count({ where }),
  ]);

  return { assignments, total };
};

export const findAssignmentById = (id: string) => {
  return prisma.assignment.findUnique({
    where: { id },
    include: assignmentInclude,
  });
};

export const updateAssignment = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: Date | null;
    assignedAt?: Date;
    validTill?: Date | null;
    status?: string;
    maxMarks?: number;
    allowLate?: boolean;
    restrictStudentUpload?: boolean;
    youtubeVideoId?: string | null;
    facultyId?: string;
    assignmentTypeMasterId?: string | null;
    academicYearMasterId?: string | null;
    classSessionId?: string | null;
    batchId?: string;
    attachmentFileKey?: string | null;
    attachmentFileName?: string | null;
    targets?: AssignmentTargetDTO[];
    recipientStudentIds?: string[] | null;
    pendingStudentIdsToAdd?: string[];
  }
) => {
  return prisma.$transaction(async (tx) => {
    if (data.targets) {
      await tx.assignmentTarget.deleteMany({ where: { assignmentId: id } });
      await tx.assignmentTarget.createMany({
        data: data.targets.map((t) => ({
          assignmentId: id,
          courseId: t.courseId,
          courseModuleId: t.courseModuleId || undefined,
          topic: t.topic || undefined,
          batchId: t.batchId,
        })),
      });
    }

    if (data.recipientStudentIds !== undefined) {
      await tx.assignmentRecipient.deleteMany({ where: { assignmentId: id } });
      if (data.recipientStudentIds && data.recipientStudentIds.length > 0) {
        await tx.assignmentRecipient.createMany({
          data: data.recipientStudentIds.map((studentId) => ({
            assignmentId: id,
            studentId,
          })),
          skipDuplicates: true,
        });
      }
    }

    if (data.pendingStudentIdsToAdd && data.pendingStudentIdsToAdd.length > 0) {
      await tx.assignmentSubmission.createMany({
        data: data.pendingStudentIdsToAdd.map((studentId) => ({
          assignmentId: id,
          studentId,
          submissionStatus: "PENDING" as AssignmentSubmissionStatus,
        })),
        skipDuplicates: true,
      });
    }

    return tx.assignment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.assignedAt !== undefined && { assignedAt: data.assignedAt }),
        ...(data.validTill !== undefined && { validTill: data.validTill }),
        ...(data.status !== undefined && { status: data.status as Prisma.EnumStatusFilter["equals"] }),
        ...(data.maxMarks !== undefined && { maxMarks: data.maxMarks }),
        ...(data.allowLate !== undefined && { allowLate: data.allowLate }),
        ...(data.restrictStudentUpload !== undefined && {
          restrictStudentUpload: data.restrictStudentUpload,
        }),
        ...(data.youtubeVideoId !== undefined && { youtubeVideoId: data.youtubeVideoId }),
        ...(data.facultyId !== undefined && { facultyId: data.facultyId }),
        ...(data.assignmentTypeMasterId !== undefined && {
          assignmentTypeMasterId: data.assignmentTypeMasterId,
        }),
        ...(data.academicYearMasterId !== undefined && {
          academicYearMasterId: data.academicYearMasterId,
        }),
        ...(data.classSessionId !== undefined && { classSessionId: data.classSessionId }),
        ...(data.batchId !== undefined && { batchId: data.batchId }),
        ...(data.attachmentFileKey !== undefined && { attachmentFileKey: data.attachmentFileKey }),
        ...(data.attachmentFileName !== undefined && {
          attachmentFileName: data.attachmentFileName,
        }),
      },
      include: assignmentInclude,
    });
  });
};

export const deleteAssignment = (id: string) => {
  return prisma.assignment.delete({ where: { id } });
};

export const findSubmissionById = (id: string) =>
  prisma.assignmentSubmission.findUnique({
    where: { id },
    include: {
      assignment: {
        select: {
          id: true,
          facultyId: true,
          title: true,
          batchId: true,
          maxMarks: true,
          allowLate: true,
          validTill: true,
          restrictStudentUpload: true,
          status: true,
          dueDate: true,
          classSession: {
            select: {
              batch: { select: { instituteId: true, branchId: true } },
            },
          },
          batch: { select: { instituteId: true, branchId: true } },
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
  });

export const gradeSubmission = (
  id: string,
  data: {
    marks: number;
    feedback?: string;
    evaluatedBy: string;
  }
) =>
  prisma.assignmentSubmission.update({
    where: { id },
    data: {
      marks: data.marks,
      feedback: data.feedback,
      evaluatedAt: new Date(),
      evaluatedBy: data.evaluatedBy,
      submissionStatus: "GRADED",
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true } },
        },
      },
      assignment: { select: { id: true, title: true, facultyId: true, maxMarks: true } },
    },
  });

export const upsertSubmission = (data: {
  assignmentId: string;
  studentId: string;
  fileKey: string;
  fileName?: string;
  notes?: string;
  submissionStatus: AssignmentSubmissionStatus;
}) =>
  prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: data.assignmentId,
        studentId: data.studentId,
      },
    },
    update: {
      fileKey: data.fileKey,
      fileName: data.fileName,
      notes: data.notes,
      submittedAt: new Date(),
      submissionStatus: data.submissionStatus,
      status: "ACTIVE",
      marks: null,
      feedback: null,
      evaluatedAt: null,
      evaluatedBy: null,
    },
    create: {
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      fileKey: data.fileKey,
      fileName: data.fileName,
      notes: data.notes,
      submittedAt: new Date(),
      submissionStatus: data.submissionStatus,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true } },
        },
      },
      assignment: {
        select: { id: true, title: true, facultyId: true, dueDate: true, maxMarks: true },
      },
    },
  });

export const findSubmissions = async (params: {
  instituteId: string;
  branchId?: string;
  batchId?: string;
  facultyId?: string;
  status?: AssignmentSubmissionStatus;
  statuses?: AssignmentSubmissionStatus[];
  submittedOnly?: boolean;
  ungradedOnly?: boolean;
  search?: string;
  skip: number;
  take: number;
}) => {
  const {
    instituteId,
    branchId,
    batchId,
    facultyId,
    status,
    statuses,
    submittedOnly,
    ungradedOnly,
    search,
    skip,
    take,
  } = params;

  const statusFilter: Prisma.AssignmentSubmissionWhereInput = ungradedOnly
    ? {
        submittedAt: { not: null },
        evaluatedAt: null,
        submissionStatus: { in: ["SUBMITTED", "LATE"] },
      }
    : statuses && statuses.length > 0
      ? { submissionStatus: { in: statuses } }
      : status
        ? { submissionStatus: status }
        : submittedOnly
          ? { submittedAt: { not: null } }
          : {};

  const where: Prisma.AssignmentSubmissionWhereInput = {
    assignment: {
      batch: {
        instituteId,
        ...(branchId ? { branchId } : {}),
      },
      ...(batchId
        ? {
            OR: [{ batchId }, { targets: { some: { batchId } } }],
          }
        : {}),
      ...(facultyId ? { facultyId } : {}),
    },
    ...statusFilter,
    ...(search
      ? {
          OR: [
            { student: { user: { name: { contains: search, mode: "insensitive" as const } } } },
            { student: { studentCode: { contains: search, mode: "insensitive" as const } } },
            { assignment: { title: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [submissions, total] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            maxMarks: true,
            allowLate: true,
            status: true,
            batchId: true,
            facultyId: true,
            batch: { select: { id: true, name: true, code: true } },
            faculty: {
              select: {
                id: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.assignmentSubmission.count({ where }),
  ]);

  return { submissions, total };
};

export const countAssignmentStats = async (params: {
  instituteId: string;
  branchId?: string;
}) => {
  const baseWhere: Prisma.AssignmentWhereInput = {
    batch: {
      instituteId: params.instituteId,
      ...(params.branchId ? { branchId: params.branchId } : {}),
    },
  };

  const [activeAssignments, pendingSubmissions, pendingGrading] = await Promise.all([
    prisma.assignment.count({
      where: { ...baseWhere, status: "ACTIVE" },
    }),
    prisma.assignmentSubmission.count({
      where: {
        submissionStatus: { in: ["SUBMITTED", "LATE"] },
        assignment: baseWhere,
      },
    }),
    prisma.assignmentSubmission.count({
      where: {
        submissionStatus: { in: ["SUBMITTED", "LATE"] },
        evaluatedAt: null,
        assignment: baseWhere,
      },
    }),
  ]);

  return { activeAssignments, pendingSubmissions, pendingGrading };
};
