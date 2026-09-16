import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthUser } from "../auth/auth.types";
import {
  assertFacultyCanAccessStudent,
  getFacultyTeachingStudentIds,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
} from "../../utils/auth-user.util";
import { assertBranchRecordAccess, getBranchScopeFilter } from "../../utils/branch-isolation.util";
import { checkConsecutiveAbsences } from "../attendance/attendance.service";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as repo from "./leave-request.repository";
import type { LeaveRequestRecord } from "./leave-request.repository";
import type { CreateLeaveRequestInput, ReviewLeaveRequestInput } from "./leave-request.validation";
import type { LeaveRequestView } from "./leave-request.types";

const MAX_LEAVE_DAYS = 14;
const REVIEW_ROLES = ["ADMIN", "SUPER_ADMIN", "CENTER_MANAGER", "COUNSELLOR", "FACULTY"];

const todayDateKey = (now = new Date()): string =>
  now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const parseCalendarNoon = (value: string): Date => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new AppError("Invalid date", 422);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
};

const inclusiveDayCount = (startKey: string, endKey: string): number => {
  const start = parseCalendarNoon(startKey).getTime();
  const end = parseCalendarNoon(endKey).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
};

const toDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const rangeBounds = (start: Date, end: Date) => {
  const rangeStart = new Date(start);
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setUTCHours(23, 59, 59, 999);
  return { rangeStart, rangeEnd };
};

const hasReviewRole = (user: AuthUser): boolean =>
  user.roles.some((role) => REVIEW_ROLES.includes(role));

const toView = (row: LeaveRequestRecord): LeaveRequestView => ({
  id: row.id,
  studentId: row.studentId,
  studentName: row.student.user?.name || "Student",
  studentCode: row.student.studentCode,
  startDate: toDateKey(row.startDate),
  endDate: toDateKey(row.endDate),
  reason: row.reason,
  status: row.status,
  reviewNote: row.reviewNote,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  reviewedByName: row.reviewedBy?.name ?? null,
  createdAt: row.createdAt.toISOString(),
});

const resolveOwnStudent = async (user: AuthUser) => {
  const student = await prisma.student.findFirst({
    where: {
      instituteId: user.instituteId,
      OR: user.studentId ? [{ id: user.studentId }, { userId: user.id }] : [{ userId: user.id }],
    },
  });
  if (!student) {
    throw new AppError("Student profile not found", 404);
  }
  return student;
};

const assertCanReview = async (user: AuthUser, record: LeaveRequestRecord) => {
  if (!hasReviewRole(user)) {
    throw new AppError("Forbidden — insufficient role", 403);
  }
  if (record.instituteId !== user.instituteId) {
    throw new AppError("Leave request not found", 404);
  }
  assertBranchRecordAccess(user, record.branchId, "Leave request not found");
  await assertFacultyCanAccessStudent(user, record.studentId);
};

const notifyApprovedLeave = (studentId: string, classSessionId: string) => {
  void (async () => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { name: true } } },
      });
      const session = await prisma.classSession.findUnique({
        where: { id: classSessionId },
        include: { batch: { select: { name: true } } },
      });
      if (!student || !session) return;
      await triggerNotification({
        instituteId: student.instituteId,
        studentId: student.id,
        event: NotificationEvent.LEAVE_STATUS_UPDATED,
        idempotencyKey: buildIdempotencyKey.LEAVE_STATUS_UPDATED(studentId, classSessionId),
        templateParams: {
          student_name: student.user?.name ?? "Student",
          batch_name: session.batch?.name ?? "Batch",
          date: toDateKey(session.scheduledDate),
          status: "LEAVE",
        },
        metadata: { classSessionId, source: "leave-request" },
      });
    } catch (err) {
      logger.error({ err, studentId, classSessionId }, "[leave-requests] leave notification failed");
    }
  })();
};

export const createLeaveRequest = async (user: AuthUser, input: CreateLeaveRequestInput) => {
  if (!user.roles.includes("STUDENT")) {
    throw new AppError("Only students can request leave", 403);
  }

  const today = todayDateKey();
  if (input.startDate < today || input.endDate < today) {
    throw new AppError("Leave dates cannot be in the past", 422);
  }
  if (inclusiveDayCount(input.startDate, input.endDate) > MAX_LEAVE_DAYS) {
    throw new AppError(`Leave cannot be longer than ${MAX_LEAVE_DAYS} days`, 422);
  }

  const student = await resolveOwnStudent(user);
  const startDate = parseCalendarNoon(input.startDate);
  const endDate = parseCalendarNoon(input.endDate);

  const overlap = await repo.findOverlappingPending(student.id, startDate, endDate);
  if (overlap) {
    throw new AppError("You already have a pending leave request for these dates", 409);
  }

  const created = await repo.create({
    startDate,
    endDate,
    reason: input.reason,
    student: { connect: { id: student.id } },
    institute: { connect: { id: student.instituteId } },
    branch: { connect: { id: student.branchId } },
  });

  return toView(created);
};

export const listMyLeaveRequests = async (user: AuthUser) => {
  if (!user.roles.includes("STUDENT")) {
    throw new AppError("Forbidden — insufficient role", 403);
  }
  const student = await resolveOwnStudent(user);
  const rows = await repo.listForStudent(student.id);
  return rows.map(toView);
};

export const cancelLeaveRequest = async (user: AuthUser, id: string) => {
  if (!user.roles.includes("STUDENT")) {
    throw new AppError("Forbidden — insufficient role", 403);
  }
  const student = await resolveOwnStudent(user);
  const existing = await repo.findById(id);
  if (!existing || existing.studentId !== student.id) {
    throw new AppError("Leave request not found", 404);
  }
  if (existing.status !== "PENDING") {
    throw new AppError("Only a pending leave request can be cancelled", 409);
  }

  const result = await repo.cancelPending(id, student.id);
  if (result.count !== 1) {
    throw new AppError("This leave request was already reviewed", 409);
  }

  const updated = await repo.findById(id);
  if (!updated) {
    throw new AppError("Leave request not found", 404);
  }
  return toView(updated);
};

export const listPendingLeaveRequests = async (user: AuthUser) => {
  if (!hasReviewRole(user)) {
    throw new AppError("Forbidden — insufficient role", 403);
  }

  const scope = getBranchScopeFilter(user);
  const where: Prisma.LeaveRequestWhereInput = {
    instituteId: scope.instituteId,
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
    ...(scope.branchIds?.length ? { branchId: { in: scope.branchIds } } : {}),
  };

  if (isPureFaculty(user.roles)) {
    const facultyId = await requireFacultyIdIfPureFaculty(user);
    const studentIds = facultyId
      ? await getFacultyTeachingStudentIds(facultyId, user.instituteId)
      : [];
    if (studentIds.length === 0) return [];
    where.studentId = { in: studentIds };
  }

  const rows = await repo.listPending(where);
  return rows.map(toView);
};

export const reviewLeaveRequest = async (
  user: AuthUser,
  id: string,
  input: ReviewLeaveRequestInput
) => {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError("Leave request not found", 404);
  }
  await assertCanReview(user, existing);
  if (existing.status !== "PENDING") {
    throw new AppError("This leave request was already reviewed", 409);
  }

  if (input.decision === "REJECTED") {
    const result = await repo.rejectPending(id, user.id, input.reviewNote);
    if (result.count !== 1) {
      throw new AppError("This leave request was already reviewed", 409);
    }
    const updated = await repo.findById(id);
    if (!updated) throw new AppError("Leave request not found", 404);
    return toView(updated);
  }

  const { rangeStart, rangeEnd } = rangeBounds(existing.startDate, existing.endDate);
  const sessions = await repo.findSessionsInRange(existing.studentId, rangeStart, rangeEnd);
  const approved = await repo.approveAndMarkLeave({
    id,
    reviewedById: user.id,
    reviewNote: input.reviewNote,
    classSessionIds: sessions.map((session) => session.id),
    studentId: existing.studentId,
  });

  if (!approved) {
    throw new AppError("This leave request was already reviewed", 409);
  }

  const batchIds = [...new Set(sessions.map((session) => session.batchId))];
  setImmediate(() => {
    for (const session of sessions) {
      notifyApprovedLeave(existing.studentId, session.id);
    }
    for (const batchId of batchIds) {
      void checkConsecutiveAbsences(existing.studentId, batchId);
    }
  });

  return toView(approved);
};
