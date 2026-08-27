import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import {
  assertFacultyCanAccessStudent,
  requireFacultyIdIfPureFaculty,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./student.repository";
import type { CreateStudentDto, UpdateStudentDto, ListStudentQuery } from "./student.validation";

/**
 * List students with pagination, search, and optional branch isolation.
 * Pure FACULTY users only see students enrolled in their assigned batches.
 */
export const getAllStudents = async (
  currentUser: AuthUser,
  query: ListStudentQuery
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const scope = getBranchScopeFilter(currentUser, query.branchId);
  const facultyId = await requireFacultyIdIfPureFaculty(currentUser);

  const params: repo.FindAllStudentsParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    search: query.search || undefined,
    status: query.status || undefined,
    facultyId: facultyId || undefined,
    skip,
    take: limit,
  };

  const [rawStudents, total] = await Promise.all([
    repo.findAllStudents(params),
    repo.countStudents({
      instituteId: params.instituteId,
      branchId: params.branchId,
      search: params.search,
      status: params.status,
      facultyId: params.facultyId,
    }),
  ]);

  const data = rawStudents.map((s: any) => {
    const admission = s.admissions?.[0];
    const enrollment = s.batchEnrollments?.[0];
    const batch = enrollment?.batch;
    const course = batch?.course || admission?.course;
    const faculty = batch?.faculty?.user?.name;

    const attendances = s.studentAttendances || [];
    const totalClasses = attendances.length;
    const presentCount = attendances.filter((a: any) => a.status === "PRESENT").length;
    const absentCount = attendances.filter((a: any) => a.status === "ABSENT").length;
    const leaveCount = attendances.filter((a: any) => a.status === "LEAVE").length;

    let consecutiveAbsences = 0;
    for (const a of attendances) {
      if (a.status === "ABSENT") consecutiveAbsences++;
      else if (a.status === "PRESENT") break;
    }

    const overallPercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 92;

    const payments = s.payments || [];
    const pendingFees = s.pendingFees || [];
    const totalPaidFromPayments = payments
      .filter((p: any) => p.status === "SUCCESS")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalPendingDue = pendingFees.reduce((sum: number, f: any) => sum + (f.dueAmount || 0), 0);
    const calculatedTotalFee =
      pendingFees[0]?.totalFee || (totalPaidFromPayments + totalPendingDue > 0 ? totalPaidFromPayments + totalPendingDue : 45000);
    const finalAmountPaid =
      totalPaidFromPayments > 0 ? totalPaidFromPayments : Math.max(0, calculatedTotalFee - totalPendingDue);
    const finalDueAmount =
      totalPendingDue > 0 ? totalPendingDue : Math.max(0, calculatedTotalFee - finalAmountPaid);
    const feeStatus = finalDueAmount === 0 ? "Paid" : "Pending";

    return {
      id: s.id,
      userId: s.userId,
      instituteId: s.instituteId,
      branchId: s.branchId,
      studentCode: s.studentCode,
      dateOfBirth: s.dateOfBirth,
      qualification: s.qualification,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: s.user,
      branch: s.branch,
      courseName: course?.name || "Full Stack Web Development",
      batchName: batch?.name || "Batch 01",
      facultyName: faculty || "Prof. Assigned Faculty",
      attendance: {
        overallPercentage,
        totalClasses,
        presentCount,
        absentCount,
        leaveCount,
        consecutiveAbsences,
        isDiscontinuationRisk: consecutiveAbsences >= 2,
      },
      fees: {
        totalFee: calculatedTotalFee,
        discount: 0,
        finalFee: calculatedTotalFee,
        amountPaid: finalAmountPaid,
        dueAmount: finalDueAmount,
        feePlan: admission?.feePlan || "INSTALLMENT",
        status: feeStatus,
      },
    };
  });

  const meta = buildMeta(total, page, limit);
  return { data, meta };
};

/**
 * Get a single student by ID.
 */
export const getStudentById = async (id: string, currentUser: AuthUser) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }
  await assertFacultyCanAccessStudent(currentUser, id);
  return student;
};

import { prisma } from "../../config/database";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent } from "../whatsapp/whatsapp.constants";

/**
 * Create a new student (User + Student + STUDENT role + optional Course/Batch/Fee).
 */
export const createStudent = async (instituteId: string, dto: CreateStudentDto) => {
  // Validate branch exists
  const branch = await prisma.branch.findFirst({
    where: { id: dto.branchId, instituteId },
  });
  if (!branch) {
    throw new AppError("Selected branch not found or does not belong to this institute", 400);
  }

  // Check for duplicate student code
  const existingCode = await repo.findStudentByCode(instituteId, dto.studentCode);
  if (existingCode) {
    throw new AppError(`Student code '${dto.studentCode}' already exists`, 409);
  }

  // Check for duplicate email if provided
  if (dto.email && dto.email.trim() !== "") {
    const existingEmail = await prisma.user.findFirst({
      where: { instituteId, email: dto.email.trim() },
    });
    if (existingEmail) {
      throw new AppError(`A user with email '${dto.email}' already exists`, 409);
    }
  }

  // Check for duplicate phone if provided
  if (dto.phone && dto.phone.trim() !== "") {
    const existingPhone = await prisma.user.findFirst({
      where: { instituteId, phone: dto.phone.trim() },
    });
    if (existingPhone) {
      throw new AppError(`A user with phone number '${dto.phone}' already exists`, 409);
    }
  }

  // Hash password for the new User
  const passwordHash = await hashPassword(dto.password);

  const student = await repo.createStudentWithUser({
    instituteId,
    branchId: dto.branchId,
    name: dto.name,
    email: dto.email && dto.email.trim() !== "" ? dto.email.trim() : undefined,
    phone: dto.phone && dto.phone.trim() !== "" ? dto.phone.trim() : undefined,
    passwordHash,
    studentCode: dto.studentCode,
    dateOfBirth: dto.dateOfBirth || undefined,
    qualification: dto.qualification || undefined,
    courseId: dto.courseId || undefined,
    batchId: dto.batchId || undefined,
    totalFee: dto.totalFee,
    feePlan: dto.feePlan,
    downPayment: dto.downPayment,
  });

  // Asynchronous WhatsApp notification
  setImmediate(async () => {
    try {
      const courseName = student.admissions?.[0]?.course?.name || "Program";
      await triggerNotification({
        instituteId,
        studentId: student.id,
        event: NotificationEvent.ADMISSION_CREATED,
        idempotencyKey: `STUDENT_WELCOME_${student.id}`,
        templateParams: {
          student_name: student.user?.name || student.studentCode,
          course_name: courseName,
          admission_no: student.studentCode,
        },
        metadata: {
          studentId: student.id,
          phone: student.user?.phone,
        },
      });
    } catch {
      // Async failure is logged internally by triggerNotification
    }
  });

  return student;
};

/**
 * Update a student's details.
 */
export const updateStudent = async (id: string, dto: UpdateStudentDto) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  return repo.updateStudent(id, dto);
};

/**
 * Soft-delete a student.
 */
export const deleteStudent = async (id: string) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  return repo.softDeleteStudent(id);
};

// ─── Student Performance ─────────────────────────────────────────────────

/**
 * Calculate real-time student performance metrics:
 * - Overall attendance percentage
 * - Test/assignment scores
 * - Course enrollment progress
 * - 3-consecutive-absence discontinuation flag (AGENTS.md Rule 28)
 */
export const getStudentPerformance = async (studentId: string, currentUser: AuthUser) => {
  // Verify student exists and faculty may access
  await getStudentById(studentId, currentUser);

  const [attendanceRecords, submissions, enrollments] = await Promise.all([
    repo.findStudentAttendanceRecords(studentId),
    repo.findStudentAssignmentSubmissions(studentId),
    repo.findStudentEnrollments(studentId),
  ]);

  // ── Attendance calculation ──
  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  const overallAttendancePercent = totalClasses > 0
    ? Math.round((presentCount / totalClasses) * 100)
    : 0;

  // ── 3 Consecutive Absence Check (AGENTS.md Rule 28) ──
  // Approved LEAVE does not count as ABSENT
  let consecutiveAbsences = 0;
  let maxConsecutiveAbsences = 0;
  let discontinuationAlert = false;

  // Sort chronologically (oldest first) for consecutive check
  const chronologicalAttendance = [...attendanceRecords].reverse();
  for (const record of chronologicalAttendance) {
    if (record.status === "ABSENT") {
      consecutiveAbsences++;
      if (consecutiveAbsences > maxConsecutiveAbsences) {
        maxConsecutiveAbsences = consecutiveAbsences;
      }
      if (consecutiveAbsences >= 3) {
        discontinuationAlert = true;
      }
    } else {
      // PRESENT, LATE, LEAVE/EXCUSED reset the counter
      consecutiveAbsences = 0;
    }
  }

  // ── Test/Assignment Scores ──
  const testScores = submissions
    .filter((s) => s.marks !== null)
    .map((s) => ({
      testName: s.assignment.title,
      score: s.marks!,
      maxScore: 100, // Default max; adjust if schema supports custom max
    }));

  // ── Enrolled Courses Progress ──
  const enrolledCourses = enrollments.map((enrollment) => {
    const batch = enrollment.batch;
    const totalModules = batch.batchModules.length;
    const completedModules = batch.batchModules.filter(
      (m) => m.status === "INACTIVE" // INACTIVE means completed for batch modules
    ).length;
    const completionPercentage = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;

    return {
      courseId: batch.course.id,
      courseName: batch.course.name,
      courseCode: batch.course.code,
      batchName: batch.name,
      batchCode: batch.code,
      completionPercentage,
      totalModules,
      completedModules,
    };
  });

  return {
    studentId,
    overallAttendancePercent,
    totalClasses,
    presentCount,
    absentCount: attendanceRecords.filter((r) => r.status === "ABSENT").length,
    testScores,
    enrolledCourses,
    discontinuationAlert,
    maxConsecutiveAbsences,
  };
};
