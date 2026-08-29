import { prisma } from "../../config/database";
import type { Prisma } from "@prisma/client";

const assignmentInclude = {
  classSession: {
    select: {
      id: true,
      title: true,
      scheduledDate: true,
      startTime: true,
      batch: { select: { id: true, name: true, instituteId: true, branchId: true } },
    },
  },
  submissions: {
    select: {
      id: true,
      studentId: true,
      status: true,
      marks: true,
      feedback: true,
      submittedAt: true,
      evaluatedAt: true,
      evaluatedBy: true,
      fileKey: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.AssignmentInclude;

export const createAssignment = (data: {
  classSessionId: string;
  batchId: string;
  facultyId: string;
  title: string;
  description?: string;
  dueDate?: Date;
}) => {
  return prisma.assignment.create({
    data: {
      classSessionId: data.classSessionId,
      batchId: data.batchId,
      facultyId: data.facultyId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
    },
    include: assignmentInclude,
  });
};

export const findAssignments = async (params: {
  instituteId: string;
  branchId?: string;
  batchId?: string;
  classSessionId?: string;
  facultyId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
}) => {
  const { instituteId, branchId, batchId, classSessionId, facultyId, status, search, skip, take } = params;

  const where: Prisma.AssignmentWhereInput = {
    classSession: {
      batch: {
        instituteId,
        ...(branchId ? { branchId } : {}),
      },
    },
    ...(batchId ? { batchId } : {}),
    ...(classSessionId ? { classSessionId } : {}),
    ...(facultyId ? { facultyId } : {}),
    ...(status ? { status: status as any } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { createdAt: "desc" },
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
    dueDate?: Date;
    status?: string;
  }
) => {
  return prisma.assignment.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.status !== undefined && { status: data.status as any }),
    },
    include: assignmentInclude,
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
          classSession: {
            select: {
              batch: { select: { instituteId: true, branchId: true } },
            },
          },
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

export const gradeSubmission = (id: string, data: {
  marks: number;
  feedback?: string;
  evaluatedBy: string;
}) =>
  prisma.assignmentSubmission.update({
    where: { id },
    data: {
      marks: data.marks,
      feedback: data.feedback,
      evaluatedAt: new Date(),
      evaluatedBy: data.evaluatedBy,
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          user: { select: { id: true, name: true } },
        },
      },
      assignment: { select: { id: true, title: true, facultyId: true } },
    },
  });

