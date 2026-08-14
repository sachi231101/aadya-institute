import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./student.repository";
import type { CreateStudentDto, UpdateStudentDto, ListStudentQuery } from "./student.validation";

/**
 * List students with pagination, search, and optional branch isolation.
 */
export const getAllStudents = async (
  currentUser: AuthUser,
  query: ListStudentQuery
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const scope = getBranchScopeFilter(currentUser, query.branchId);

  const params: repo.FindAllStudentsParams = {
    instituteId: scope.instituteId,
    branchId: scope.branchId,
    search: query.search || undefined,
    status: query.status || undefined,
    skip,
    take: limit,
  };

  const [data, total] = await Promise.all([
    repo.findAllStudents(params),
    repo.countStudents({
      instituteId: params.instituteId,
      branchId: params.branchId,
      search: params.search,
      status: params.status,
    }),
  ]);

  const meta = buildMeta(total, page, limit);
  return { data, meta };
};

/**
 * Get a single student by ID.
 */
export const getStudentById = async (id: string) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  return student;
};

import { prisma } from "../../config/database";

/**
 * Create a new student (User + Student + STUDENT role).
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
  if (dto.email) {
    const existingEmail = await prisma.user.findFirst({
      where: { instituteId, email: dto.email },
    });
    if (existingEmail) {
      throw new AppError(`A user with email '${dto.email}' already exists`, 409);
    }
  }

  // Check for duplicate phone if provided
  if (dto.phone) {
    const existingPhone = await prisma.user.findFirst({
      where: { instituteId, phone: dto.phone },
    });
    if (existingPhone) {
      throw new AppError(`A user with phone number '${dto.phone}' already exists`, 409);
    }
  }

  // Hash password for the new User
  const passwordHash = await hashPassword(dto.password);

  return repo.createStudentWithUser({
    instituteId,
    branchId: dto.branchId,
    name: dto.name,
    email: dto.email,
    phone: dto.phone,
    passwordHash,
    studentCode: dto.studentCode,
    dateOfBirth: dto.dateOfBirth,
    qualification: dto.qualification,
  });
};

/**
 * Update a student's details.
 */
export const updateStudent = async (id: string, dto: UpdateStudentDto) => {
  await getStudentById(id); // throws 404 if not found
  return repo.updateStudent(id, dto);
};

/**
 * Soft-delete a student.
 */
export const deleteStudent = async (id: string) => {
  await getStudentById(id); // throws 404 if not found
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
export const getStudentPerformance = async (studentId: string) => {
  // Verify student exists
  await getStudentById(studentId);

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
