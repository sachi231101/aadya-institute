import { AppError } from "../../middlewares/error.middleware";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { buildMeta } from "../../utils/pagination";
import { triggerNotification } from "../notifications/notification.service";
import { NotificationEvent, buildIdempotencyKey } from "../notifications/notification.constants";
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

  // Non-admin roles are locked to their branch via the batch relation
  const branchId = currentUser.roles.includes("ADMIN") ? undefined : (currentUser.branchId ?? undefined);

  const { assignments, total } = await repo.findAssignments({
    instituteId: currentUser.instituteId,
    branchId,
    batchId: query.batchId,
    classSessionId: query.classSessionId,
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
  const session = await prisma.classSession.findUnique({
    where: { id: dto.classSessionId },
    include: { batch: true },
  });

  if (!session || session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Class session not found", 404);
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
