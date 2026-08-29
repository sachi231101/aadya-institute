import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { buildMeta } from "../../utils/pagination";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./feedback.repository";
import type {
  SubmitFeedbackDto,
  ListFeedbackQuery,
  FacultyRatingsQuery,
} from "./feedback.validation";

const resolveOwnStudentId = async (currentUser: AuthUser): Promise<string | null> => {
  if (currentUser.studentId) return currentUser.studentId;
  const student = await prisma.student.findFirst({
    where: { userId: currentUser.id, instituteId: currentUser.instituteId },
    select: { id: true },
  });
  return student?.id ?? null;
};

export const listFeedback = async (currentUser: AuthUser, query: ListFeedbackQuery) => {
  const page = query.page || 1;
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  let studentId = query.studentId;
  let classSessionId = query.classSessionId;
  let facultyId = query.facultyId;

  if (currentUser.roles.includes("STUDENT") && !currentUser.roles.includes("ADMIN")) {
    const ownId = await resolveOwnStudentId(currentUser);
    if (!ownId) throw new AppError("Student profile not found", 403);
    if (studentId && studentId !== ownId) {
      throw new AppError("Forbidden — students can only view their own feedback", 403);
    }
    studentId = ownId;
  }

  if (
    currentUser.roles.includes("FACULTY") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("COUNSELLOR")
  ) {
    const faculty =
      currentUser.facultyId ||
      (
        await prisma.faculty.findFirst({
          where: { userId: currentUser.id },
          select: { id: true },
        })
      )?.id;
    if (!faculty) throw new AppError("Faculty profile not found", 403);
    if (facultyId && facultyId !== faculty) {
      throw new AppError("Forbidden — you can only view your own feedback", 403);
    }
    facultyId = faculty;
  }

  const { records, total } = await repo.findFeedbackList({
    instituteId: currentUser.instituteId,
    classSessionId,
    studentId,
    facultyId,
    skip,
    take: limit,
  });

  return { data: records, meta: buildMeta(total, page, limit) };
};

export const submitFeedback = async (currentUser: AuthUser, dto: SubmitFeedbackDto) => {
  const session = await prisma.classSession.findFirst({
    where: {
      id: dto.classSessionId,
      batch: { instituteId: currentUser.instituteId },
    },
    select: { id: true, facultyId: true, batchId: true },
  });
  if (!session) throw new AppError("Class session not found", 404);

  const student = await prisma.student.findFirst({
    where: { id: dto.studentId, instituteId: currentUser.instituteId },
    select: { id: true, userId: true },
  });
  if (!student) throw new AppError("Student not found", 404);

  if (currentUser.roles.includes("STUDENT") && !currentUser.roles.includes("ADMIN")) {
    const ownId = await resolveOwnStudentId(currentUser);
    if (!ownId || ownId !== student.id) {
      throw new AppError("Forbidden — students can only submit their own feedback", 403);
    }
  }

  const enrolled = await prisma.batchEnrollment.findFirst({
    where: {
      studentId: student.id,
      batchId: session.batchId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!enrolled && currentUser.roles.includes("STUDENT")) {
    throw new AppError("You are not enrolled in this class session's batch", 403);
  }

  const facultyId = dto.facultyId || session.facultyId;
  return repo.createFeedback({
    classSessionId: dto.classSessionId,
    studentId: dto.studentId,
    facultyId,
    rating: dto.rating,
    comment: dto.comment,
  });
};

export const getFacultyRatings = async (currentUser: AuthUser, query: FacultyRatingsQuery) => {
  if (currentUser.roles.includes("STUDENT") && !currentUser.roles.includes("ADMIN")) {
    throw new AppError("Forbidden", 403);
  }

  let facultyId = query.facultyId;
  if (
    currentUser.roles.includes("FACULTY") &&
    !currentUser.roles.includes("ADMIN") &&
    !currentUser.roles.includes("CENTER_MANAGER") &&
    !currentUser.roles.includes("COUNSELLOR")
  ) {
    const own =
      currentUser.facultyId ||
      (
        await prisma.faculty.findFirst({
          where: { userId: currentUser.id },
          select: { id: true },
        })
      )?.id;
    if (!own) throw new AppError("Faculty profile not found", 403);
    facultyId = own;
  }

  return repo.findFacultyRatings({
    instituteId: currentUser.instituteId,
    facultyId,
    batchId: query.batchId,
  });
};
