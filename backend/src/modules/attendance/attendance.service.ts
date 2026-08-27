import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter, hasBranchAccess } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./attendance.repository";
import type {
  RosterQuery,
  MarkAttendanceDto,
  BulkMarkAttendanceDto,
  StudentAttendanceQuery,
  PatchAttendanceDto,
} from "./attendance.validation";
import type { AttendanceEntryItem } from "./attendance.types";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Helper to trigger absence notification for a student marked ABSENT.
 * Note: LEAVE and PRESENT statuses MUST NOT trigger this notification.
 * TODO: Check Leave module for approved leave requests before triggering notification once Leave model exists.
 */
const triggerAbsenceNotification = async (studentId: string, classSessionId: string) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    const session = await prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { batch: true },
    });

    if (!student || !session) return;

    const dateStr = session.scheduledDate.toISOString().split("T")[0];
    const idempotencyKey = buildIdempotencyKey.STUDENT_ABSENT(studentId, classSessionId);

    await triggerNotification({
      instituteId: student.instituteId,
      studentId: student.id,
      event: NotificationEvent.STUDENT_ABSENT,
      idempotencyKey,
      templateParams: {
        student_name: student.user?.name ?? "Student",
        batch_name: session.batch?.name ?? "Batch",
        date: dateStr,
      },
      metadata: {
        classSessionId,
      },
    });
  } catch (err) {
    logger.error({ err, studentId, classSessionId }, "[attendance] Failed to trigger absence notification");
  }
};

/**
 * Business Rule Check: 3 consecutive theory-class ABSENCES.
 * LEAVE is ignored (does not count as ABSENT and does not break consecutive streak).
 * PRESENT resets the consecutive absence counter to 0.
 */
export const checkConsecutiveAbsences = async (studentId: string, batchId: string) => {
  try {
    const recentRecords = await repo.findRecentStudentAttendanceForBatch(studentId, batchId, 10);
    let consecutiveAbsences = 0;

    for (const record of recentRecords) {
      if (record.status === "ABSENT") {
        consecutiveAbsences++;
      } else if (record.status === "PRESENT") {
        // PRESENT resets the streak
        break;
      }
      // LEAVE is ignored (does not increment counter and does not reset streak)
    }

    if (consecutiveAbsences >= 3) {
      logger.warn(
        { studentId, batchId, consecutiveAbsences },
        "[attendance] Business Rule Alert: Student has reached 3 consecutive ABSENCES. Eligible for discontinuation workflow."
      );
    }

    return consecutiveAbsences;
  } catch (err) {
    logger.error({ err, studentId, batchId }, "[attendance] Failed to check consecutive absences");
    return 0;
  }
};

/**
 * Verify faculty & branch authorization for a ClassSession.
 */
const verifySessionAccess = async (currentUser: AuthUser, classSessionId: string) => {
  const session = await repo.findSessionWithBatchAndFaculty(classSessionId);
  if (!session) {
    throw new AppError("Class session not found", 404);
  }

  if (session.batch.instituteId !== currentUser.instituteId) {
    throw new AppError("Forbidden — institute mismatch", 403);
  }

  // Branch isolation
  if (!currentUser.roles.includes("ADMIN") && !hasBranchAccess(currentUser, session.branchId)) {
    throw new AppError("Forbidden — you cannot access class sessions outside your assigned branch", 403);
  }

  // Faculty verification: Faculty can ONLY access class sessions assigned to them
  if (currentUser.roles.includes("FACULTY")) {
    const faculty = await prisma.faculty.findFirst({
      where: { userId: currentUser.id },
    });

    if (!faculty || session.facultyId !== faculty.id) {
      throw new AppError("Forbidden — you can only mark attendance for class sessions assigned to you", 403);
    }
  }

  return session;
};

/**
 * Get attendance records & roster for a specific ClassSession.
 */
export const getSessionAttendance = async (currentUser: AuthUser, classSessionId: string) => {
  const session = await verifySessionAccess(currentUser, classSessionId);
  const attendanceRecords = await repo.findAttendanceBySessionId(classSessionId);

  const attendanceMap = new Map(attendanceRecords.map((r) => [r.studentId, r]));

  const enrolledStudents = session.batch.enrollments.map((enrollment) => {
    const s = enrollment.student;
    const att = attendanceMap.get(s.id);
    return {
      studentId: s.id,
      studentCode: s.studentCode,
      name: s.user?.name ?? s.studentCode,
      email: s.user?.email ?? null,
      phone: s.user?.phone ?? null,
      status: att?.status ?? null,
      markedAt: att?.markedAt ?? null,
      remarks: att?.remarks ?? null,
      attendanceId: att?.id ?? null,
    };
  });

  return {
    classSession: {
      id: session.id,
      title: session.title,
      scheduledDate: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      branchId: session.branchId,
      batch: {
        id: session.batch.id,
        name: session.batch.name,
        code: session.batch.code,
        courseName: session.batch.course?.name,
      },
      faculty: {
        id: session.faculty.id,
        name: session.faculty.user.name,
      },
    },
    students: enrolledStudents,
  };
};

/**
 * Submit bulk attendance for a ClassSession.
 * Validates faculty assignment, branch isolation, and batch enrollment.
 */
export const submitBulkSessionAttendance = async (
  currentUser: AuthUser,
  classSessionId: string,
  entries: AttendanceEntryItem[]
) => {
  const session = await verifySessionAccess(currentUser, classSessionId);

  // Validate Batch Enrollment: Every student in entries MUST be actively enrolled in session.batchId
  const activeEnrolledStudentIds = new Set(session.batch.enrollments.map((e) => e.studentId));
  const invalidStudentIds = entries.filter((e) => !activeEnrolledStudentIds.has(e.studentId)).map((e) => e.studentId);

  if (invalidStudentIds.length > 0) {
    throw new AppError(
      `Cannot mark attendance: Students [${invalidStudentIds.join(", ")}] are not enrolled in batch '${session.batch.name}'`,
      400
    );
  }

  // Execute bulk upsert transaction
  const result = await repo.bulkUpsertSessionAttendance(classSessionId, entries, currentUser.id);

  // Asynchronous Trigger: ABSENT -> STUDENT_ABSENT notification (LEAVE and PRESENT skipped)
  // Also check 3 consecutive absences
  setImmediate(() => {
    for (const entry of entries) {
      if (entry.status === "ABSENT") {
        triggerAbsenceNotification(entry.studentId, classSessionId);
      }
      checkConsecutiveAbsences(entry.studentId, session.batchId);
    }
  });

  return result;
};

/**
 * Patch a single attendance record by attendanceId.
 */
export const updateAttendanceRecord = async (
  currentUser: AuthUser,
  attendanceId: string,
  dto: PatchAttendanceDto
) => {
  const existing = await repo.findAttendanceById(attendanceId);
  if (!existing) {
    throw new AppError("Attendance record not found", 404);
  }

  // Verify access to the session
  await verifySessionAccess(currentUser, existing.classSessionId);

  const updated = await repo.updateAttendanceRecord(attendanceId, {
    status: dto.status,
    remarks: dto.remarks,
    markedBy: currentUser.id,
  });

  // If status changed to ABSENT, trigger absence notification
  if (dto.status === "ABSENT") {
    setImmediate(() => {
      triggerAbsenceNotification(existing.studentId, existing.classSessionId);
      checkConsecutiveAbsences(existing.studentId, existing.classSession.batchId);
    });
  }

  return updated;
};

/**
 * Get student attendance history with RBAC check.
 */
export const getStudentAttendance = async (
  currentUser: AuthUser,
  targetStudentId: string,
  query: StudentAttendanceQuery
) => {
  const targetStudent = await prisma.student.findUnique({
    where: { id: targetStudentId },
  });

  if (!targetStudent) {
    throw new AppError("Student not found", 404);
  }

  if (targetStudent.instituteId !== currentUser.instituteId) {
    throw new AppError("Forbidden", 403);
  }

  // STUDENT role: Can ONLY view own attendance
  if (currentUser.roles.includes("STUDENT")) {
    if (targetStudent.userId !== currentUser.id) {
      throw new AppError("Forbidden — students can only view their own attendance", 403);
    }
  } else if (!currentUser.roles.includes("ADMIN") && !hasBranchAccess(currentUser, targetStudent.branchId)) {
    throw new AppError("Forbidden — branch mismatch", 403);
  }

  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const { records, total } = await repo.findStudentAttendanceHistory({
    studentId: targetStudentId,
    fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
    toDate: query.toDate ? new Date(query.toDate) : undefined,
    skip,
    take: limit,
  });

  const meta = buildMeta(total, page, limit);
  return { data: records, meta };
};

/**
 * Get student attendance summary stats.
 */
export const getStudentAttendanceSummary = async (
  currentUser: AuthUser,
  targetStudentId: string
) => {
  const targetStudent = await prisma.student.findUnique({
    where: { id: targetStudentId },
    include: { user: { select: { name: true } } },
  });

  if (!targetStudent) {
    throw new AppError("Student not found", 404);
  }

  if (targetStudent.instituteId !== currentUser.instituteId) {
    throw new AppError("Forbidden", 403);
  }

  // STUDENT role: Can ONLY view own attendance summary
  if (currentUser.roles.includes("STUDENT")) {
    if (targetStudent.userId !== currentUser.id) {
      throw new AppError("Forbidden — students can only view their own attendance summary", 403);
    }
  } else if (!currentUser.roles.includes("ADMIN") && !hasBranchAccess(currentUser, targetStudent.branchId)) {
    throw new AppError("Forbidden — branch mismatch", 403);
  }

  const stats = await repo.calculateStudentAttendanceStats(targetStudentId);

  return {
    studentId: targetStudent.id,
    studentCode: targetStudent.studentCode,
    studentName: targetStudent.user?.name ?? targetStudent.studentCode,
    ...stats,
  };
};

/**
 * List students at discontinuation risk (2+ consecutive theory absences).
 * Approved LEAVE does not count toward the streak; PRESENT resets it.
 */
export const getDiscontinuationRisk = async (
  currentUser: AuthUser,
  query: { branchId?: string }
) => {
  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const students = await prisma.student.findMany({
    where: {
      instituteId: scope.instituteId,
      status: "ACTIVE",
      ...(scope.branchId ? { branchId: scope.branchId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      branch: { select: { id: true, name: true, code: true } },
      batchEnrollments: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              code: true,
              course: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const riskStudents: Array<Record<string, unknown>> = [];

  for (const student of students) {
    const recent = await prisma.studentAttendance.findMany({
      where: {
        studentId: student.id,
        classSession: {
          // Theory-class focus: exclude explicitly practical-labelled titles when present
          NOT: { title: { contains: "Practical", mode: "insensitive" } },
        },
      },
      orderBy: { classSession: { scheduledDate: "desc" } },
      take: 15,
      select: { status: true },
    });

    let consecutiveAbsences = 0;
    for (const record of recent) {
      if (record.status === "LEAVE") continue;
      if (record.status === "ABSENT") {
        consecutiveAbsences++;
        continue;
      }
      // PRESENT (or any other status) breaks the streak
      break;
    }

    if (consecutiveAbsences < 2) continue;

    const enrollment = student.batchEnrollments[0];
    riskStudents.push({
      id: student.id,
      studentId: student.id,
      studentCode: student.studentCode,
      name: student.user?.name ?? student.studentCode,
      email: student.user?.email ?? null,
      phone: student.user?.phone ?? null,
      branchId: student.branchId,
      branch: student.branch,
      batchName: enrollment?.batch?.name ?? null,
      courseName: enrollment?.batch?.course?.name ?? null,
      consecutiveAbsences,
      riskLevel: consecutiveAbsences >= 3 ? "CRITICAL" : "WARNING",
    });
  }

  riskStudents.sort(
    (a, b) => Number(b.consecutiveAbsences) - Number(a.consecutiveAbsences)
  );

  return riskStudents;
};

// ─── Legacy functions ─────────────────────────────────────────────────────────

export const getRoster = async (currentUser: AuthUser, query: RosterQuery) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;

  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const { roster, total } = await repo.findDailyStudentRoster({
    date: query.date,
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    skip,
    take: limit,
  });

  const meta = buildMeta(total, page, limit);
  return { data: roster, meta };
};

export const markAttendance = async (dto: MarkAttendanceDto, markedBy?: string) => {
  const result = await repo.upsertStudentAttendance({
    classSessionId: dto.classSessionId,
    studentId: dto.studentId,
    status: dto.status,
    markedBy,
    remarks: dto.remarks,
  });

  if (dto.status === "ABSENT") {
    setImmediate(() => {
      triggerAbsenceNotification(dto.studentId, dto.classSessionId);
    });
  }

  return result;
};

export const bulkMarkAttendance = async (dto: BulkMarkAttendanceDto, markedBy?: string) => {
  const entries = dto.entries.map((e) => ({
    classSessionId: e.classSessionId || dto.classSessionId!,
    studentId: e.studentId,
    status: e.status,
    remarks: e.remarks,
  }));

  const result = await repo.bulkUpsertStudentAttendance(entries, markedBy);

  setImmediate(() => {
    for (const entry of entries) {
      if (entry.status === "ABSENT" && entry.classSessionId) {
        triggerAbsenceNotification(entry.studentId, entry.classSessionId);
      }
    }
  });

  return result;
};
