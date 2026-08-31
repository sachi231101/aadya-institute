import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { buildMeta } from "../../utils/pagination";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as repo from "./assignment.repository";
import type { AuthUser } from "../auth/auth.types";
import type { CreateAssignmentDTO, UpdateAssignmentDTO, AssignmentQueryDTO } from "./assignment.types";

/**
 * Resolve the Faculty record id for a user (null if the user is not a faculty member).
 */
const getFacultyIdForUser = async (userId: string): Promise<string | null> => {
  const faculty = await prisma.faculty.findUnique({ where: { userId } });
  return faculty?.id ?? null;
};

/**
 * Send ASSIGNMENT_CREATED WhatsApp notifications to all ACTIVE enrolled students
 * of the assignment's batch. Non-blocking — failures are logged, not thrown.
 */
const triggerAssignmentNotifications = async (assignmentId: string) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classSession: {
          include: {
            batch: {
              include: {
                course: true,
                enrollments: {
                  where: { status: "ACTIVE" },
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) return;

    const batch = assignment.classSession.batch;
    const dueDate = assignment.dueDate ? assignment.dueDate.toISOString().split("T")[0] : "";

    for (const enrollment of batch.enrollments) {
      const student = enrollment.student;
      if (!student.user?.phone) continue;

      await triggerNotification({
        instituteId: batch.instituteId,
        studentId: student.id,
        event: NotificationEvent.ASSIGNMENT_CREATED,
        idempotencyKey: buildIdempotencyKey.ASSIGNMENT_CREATED(student.id, assignment.id),
        templateParams: {
          student_name: student.user.name ?? "Student",
          batch_name: batch.name ?? "Batch",
          assignment_title: assignment.title,
          due_date: dueDate || "not specified",
        },
        metadata: {
          assignmentId: assignment.id,
          batchId: assignment.batchId,
          classSessionId: assignment.classSessionId,
        },
      });
    }
  } catch (err) {
    logger.error({ err, assignmentId }, "[assignments] Failed to trigger assignment notification");
  }
};

export const getAssignments = async (currentUser: AuthUser, query: AssignmentQueryDTO) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const branchId = currentUser.roles.includes("ADMIN") ? undefined : (currentUser.branchId ?? undefined);

  let facultyId = query.facultyId;
  if (currentUser.roles.includes("FACULTY") && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("CENTER_MANAGER")) {
    const ownFacultyId = await getFacultyIdForUser(currentUser.id);
    if (!ownFacultyId) throw new AppError("Faculty profile not found for this user", 403);
    facultyId = ownFacultyId;
  }

  let studentBatchIds: string[] | undefined;
  if (currentUser.roles.includes("STUDENT") && !currentUser.roles.includes("ADMIN") && !currentUser.roles.includes("FACULTY")) {
    const student = await prisma.student.findFirst({
      where: { userId: currentUser.id, instituteId: currentUser.instituteId },
      include: { batchEnrollments: { where: { status: "ACTIVE" } } },
    });
    if (!student) throw new AppError("Student profile not found", 403);
    studentBatchIds = student.batchEnrollments.map((e) => e.batchId);
    if (studentBatchIds.length === 0) {
      return { data: [], meta: buildMeta(0, page, limit) };
    }
  }

  const { assignments, total } = await repo.findAssignments({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    batchIds: studentBatchIds,
    classSessionId: query.classSessionId,
    facultyId,
    status: query.status,
    search: query.search,
    skip,
    take: limit,
  });

  return { data: assignments, meta: buildMeta(total, page, limit) };
};

export const getAssignmentById = async (currentUser: AuthUser, id: string) => {
  const assignment = await repo.findAssignmentById(id);
  if (!assignment) throw new AppError("Assignment not found", 404);

  const batch = assignment.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Assignment not found", 404);
  }

  if (!currentUser.roles.includes("ADMIN") && currentUser.branchId && batch.branchId !== currentUser.branchId) {
    throw new AppError("Assignment not found", 404);
  }

  return assignment;
};

export const createAssignment = async (currentUser: AuthUser, dto: CreateAssignmentDTO) => {
  let session = dto.classSessionId
    ? await prisma.classSession.findUnique({
        where: { id: dto.classSessionId },
        include: { batch: true },
      })
    : null;

  if (!session && dto.batchId) {
    session = await prisma.classSession.findFirst({
      where: {
        batchId: dto.batchId,
        batch: { instituteId: currentUser.instituteId },
        status: "ACTIVE",
      },
      include: { batch: true },
      orderBy: { scheduledDate: "desc" },
    });
  }

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found. Schedule a class for this batch first.", 404);
  }

  // Faculty may only create assignments for sessions they teach
  if (currentUser.roles.includes("FACULTY")) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== session.facultyId) {
      throw new AppError("You can only create assignments for your own class sessions", 403);
    }
  }

  const assignment = await repo.createAssignment({
    classSessionId: session.id,
    batchId: session.batchId,
    facultyId: session.facultyId,
    title: dto.title,
    description: dto.description || undefined,
    dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
  });

  setImmediate(() => {
    triggerAssignmentNotifications(assignment.id);
  });

  return assignment;
};

export const updateAssignment = async (currentUser: AuthUser, id: string, dto: UpdateAssignmentDTO) => {
  const existing = await getAssignmentById(currentUser, id);

  if (currentUser.roles.includes("FACULTY")) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== existing.facultyId) {
      throw new AppError("You can only update your own assignments", 403);
    }
  }

  return repo.updateAssignment(id, {
    title: dto.title,
    description: dto.description,
    dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    status: dto.status,
  });
};

export const deleteAssignment = async (currentUser: AuthUser, id: string) => {
  const existing = await getAssignmentById(currentUser, id);

  if (currentUser.roles.includes("FACULTY")) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== existing.facultyId) {
      throw new AppError("You can only delete your own assignments", 403);
    }
  }

  await repo.deleteAssignment(id);
  return { id, deleted: true };
};

export const gradeSubmission = async (
  currentUser: AuthUser,
  submissionId: string,
  dto: { marks: number; feedback?: string }
) => {
  const submission = await repo.findSubmissionById(submissionId);
  if (!submission) throw new AppError("Submission not found", 404);

  const batch = submission.assignment.classSession?.batch;
  if (!batch || batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Submission not found", 404);
  }

  if (currentUser.roles.includes("FACULTY")) {
    const facultyId = await getFacultyIdForUser(currentUser.id);
    if (!facultyId || facultyId !== submission.assignment.facultyId) {
      throw new AppError("You can only grade submissions for your own assignments", 403);
    }
  }

  if (!submission.submittedAt) {
    throw new AppError("Cannot grade a submission that has not been submitted", 400);
  }

  return repo.gradeSubmission(submissionId, {
    marks: dto.marks,
    feedback: dto.feedback || undefined,
    evaluatedBy: currentUser.id,
  });
};

export const submitAssignment = async (
  currentUser: AuthUser,
  assignmentId: string,
  dto: { fileKey: string; notes?: string }
) => {
  const assignment = await getAssignmentById(currentUser, assignmentId);

  const student = await prisma.student.findFirst({
    where: { userId: currentUser.id, instituteId: currentUser.instituteId },
  });
  if (!student) throw new AppError("Student profile not found", 403);

  const enrollment = await prisma.batchEnrollment.findFirst({
    where: {
      batchId: assignment.batchId,
      studentId: student.id,
      status: "ACTIVE",
    },
  });
  if (!enrollment) {
    throw new AppError("You are not enrolled in the batch for this assignment", 403);
  }

  if (assignment.dueDate && new Date() > assignment.dueDate) {
    throw new AppError("Assignment due date has passed", 400);
  }

  return repo.upsertSubmission({
    assignmentId,
    studentId: student.id,
    fileKey: dto.fileKey,
  });
};

