import crypto from "crypto";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { assertPasswordMeetsInstitutePolicy } from "../../utils/password-policy.util";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { buildMeta } from "../../utils/pagination";
import {
  assertBranchRecordAccess,
  getBranchScopeFilter,
  hasBranchAccess,
} from "../../utils/branch-isolation.util";
import { assertCourseAvailableForBranch } from "../../utils/course-branch.util";
import {
  assertFacultyCanAccessStudent,
  isPureFaculty,
  requireFacultyIdIfPureFaculty,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./student.repository";
import type {
  CreateStudentDto,
  UpdateStudentDto,
  ListStudentQuery,
  DiscontinueStudentDto,
  ContinueStudentDto,
} from "./student.validation";
import { SequenceService } from "../masters/sequence.service";
import {
  formatBatchSubjectNames,
  getBatchCourseRows,
  getSessionSubjectLabel,
} from "../../utils/batch-course.util";
import {
  collectStudentCourses,
  formatStudentCourseNames,
} from "./student-courses.util";

type AttendanceLike = {
  status: string;
  markedAt?: Date;
  classSession?: { scheduledDate?: Date };
};

/** Current consecutive theory absences from most recent sessions (LEAVE/PRESENT reset streak). */
const computeCurrentConsecutiveAbsences = (records: AttendanceLike[]): number => {
  const sorted = [...records].sort((a, b) => {
    const da = a.classSession?.scheduledDate ?? a.markedAt ?? new Date(0);
    const db = b.classSession?.scheduledDate ?? b.markedAt ?? new Date(0);
    return new Date(db).getTime() - new Date(da).getTime();
  });

  let streak = 0;
  for (const record of sorted) {
    if (record.status === "ABSENT") streak++;
    else break;
  }
  return streak;
};

const computeAttendanceSummary = (records: AttendanceLike[]) => {
  const totalClasses = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const leaveCount = records.filter((r) => r.status === "LEAVE").length;
  const consecutiveAbsences = computeCurrentConsecutiveAbsences(records);
  const overallPercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  return {
    overallPercentage,
    totalClasses,
    presentCount,
    absentCount,
    leaveCount,
    consecutiveAbsences,
    isDiscontinuationRisk: consecutiveAbsences >= 2,
  };
};

const computeFeeSummary = (payments: any[], pendingFees: any[], admission?: any) => {
  const totalPaidFromPayments = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum: number, p) => sum + Number(p.amount || 0), 0);
  const totalPendingDue = pendingFees.reduce(
    (sum: number, f) => sum + Math.max(0, Number(f.dueAmount || 0)),
    0
  );
  const byHead = new Map<string, number>();
  for (const f of pendingFees) {
    const key = f.feeHeadMasterId || f.feeHead || "Fee";
    byHead.set(
      key,
      (byHead.get(key) || 0) + Number(f.amountPaid || 0) + Math.max(0, Number(f.dueAmount || 0))
    );
  }
  const calculatedTotalFee =
    Array.from(byHead.values()).reduce((s, v) => s + v, 0) ||
    (totalPaidFromPayments + totalPendingDue > 0 ? totalPaidFromPayments + totalPendingDue : 0);
  const finalAmountPaid =
    totalPaidFromPayments > 0 ? totalPaidFromPayments : Math.max(0, calculatedTotalFee - totalPendingDue);
  const finalDueAmount =
    totalPendingDue > 0 ? totalPendingDue : Math.max(0, calculatedTotalFee - finalAmountPaid);
  const nextDue = pendingFees.find((f) => Number(f.dueAmount) > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasOverdue = pendingFees.some((f) => {
    if (!(Number(f.dueAmount) > 0)) return false;
    if (f.status === "OVERDUE") return true;
    const due = new Date(f.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const hasPartial = pendingFees.some((f) => Number(f.dueAmount) > 0 && Number(f.amountPaid || 0) > 0);

  let status: "Paid" | "Overdue" | "Partial" | "Pending" = "Pending";
  if (finalDueAmount === 0 && calculatedTotalFee > 0) status = "Paid";
  else if (calculatedTotalFee === 0) status = "Pending";
  else if (hasOverdue) status = "Overdue";
  else if (hasPartial || (finalAmountPaid > 0 && finalDueAmount > 0)) status = "Partial";
  else status = "Pending";

  return {
    totalFee: calculatedTotalFee,
    discount: 0,
    finalFee: calculatedTotalFee,
    amountPaid: finalAmountPaid,
    dueAmount: finalDueAmount,
    feePlan: admission?.feePlan || "INSTALLMENT",
    status,
    nextDueDate: nextDue?.dueDate ?? undefined,
    byFeeHead: Array.from(byHead.entries()).map(([feeHead, total]) => ({ feeHead, total })),
  };
};

import {
  collectStudentCourses,
  formatStudentCourseNames,
} from "./student-courses.util";

const mapStudentSummary = (s: any) => {
  const admission = s.admissions?.[0];
  const enrollment = s.batchEnrollments?.[0];
  const batch = enrollment?.batch;
  const courses = collectStudentCourses(s);
  const course = courses[0] || batch?.course || admission?.course;
  const faculty = batch?.faculty?.user?.name;
  const attendances = s.studentAttendances || [];

  const isDraft = admission?.status === "PENDING" || (s.status as string) === "PENDING" || (s.status as string) === "DRAFT";

  const admissionNotes = admission?.notes || "";
  const extractFromNotes = (pattern: RegExp) => {
    const match = admissionNotes.match(pattern);
    return match ? match[1].trim() : null;
  };
  const bloodGroup = s.bloodGroup || extractFromNotes(/Blood Group:\s*([^|\n]+)/i) || null;
  const gender = s.gender || extractFromNotes(/Gender:\s*([^|\n]+)/i) || null;
  const guardianName = s.guardianName || extractFromNotes(/(?:Father's Name|Mother's Name|Guardian Name|Guardian):\s*([^|\n]+)/i) || null;
  const guardianPhone = s.guardianPhone || extractFromNotes(/Guardian Phone:\s*([^|\n]+)/i) || null;
  const addressStr = s.address || extractFromNotes(/Address:\s*([^|\n]+)/i) || null;

  let enquiryAt: Date | null = null;
  for (const lead of s.convertedFromLeads || []) {
    if (lead.createdAt && (!enquiryAt || new Date(lead.createdAt) < enquiryAt)) {
      enquiryAt = new Date(lead.createdAt);
    }
  }
  for (const adm of s.admissions || []) {
    const leadCreatedAt = adm.application?.lead?.createdAt;
    if (leadCreatedAt && (!enquiryAt || new Date(leadCreatedAt) < enquiryAt)) {
      enquiryAt = new Date(leadCreatedAt);
    }
  }

  const counsellorName =
    (s.convertedFromLeads || []).find((lead: any) => lead.assignedCounsellor?.name)?.assignedCounsellor?.name ||
    (s.admissions || [])
      .map((a: any) => a.application?.lead?.assignedCounsellor?.name)
      .find((n: string | undefined) => !!n) ||
    extractFromNotes(/Counsellor:\s*([^|\n]+)/i) ||
    null;
  const leadSource =
    (s.convertedFromLeads || []).find((lead: any) => lead.source)?.source ||
    extractFromNotes(/(?:Lead source|Source):\s*([^|\n]+)/i) ||
    null;

  return {
    id: s.id,
    userId: s.userId,
    instituteId: s.instituteId,
    branchId: s.branchId,
    studentCode: s.studentCode,
    dateOfBirth: s.dateOfBirth,
    enquiryDate: enquiryAt ? enquiryAt.toISOString() : null,
    qualification: s.qualification,
    gender,
    counsellorName,
    bloodGroup,
    guardian: guardianName || guardianPhone ? { name: guardianName, phone: guardianPhone, relation: "Parent / Guardian" } : null,
    address: addressStr
      ? {
          street: addressStr,
          city: typeof s.address === "object" ? s.address?.city || null : null,
          pincode: typeof s.address === "object" ? s.address?.pincode || null : null,
        }
      : null,
    leadSource,
    status: isDraft ? "DRAFT" : s.status,
    admissionStatus: admission?.status ?? null,
    admissionNo: admission?.admissionNo ?? null,
    admissionDate: admission?.admissionDate ?? null,
    isDraft,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    user: s.user,
    displayName: s.user?.name || admission?.studentName || s.studentCode,
    branch: s.branch,
    courseName:
      courses.length > 0
        ? formatStudentCourseNames(courses)
        : course?.name ?? null,
    courses,
    batchId: batch?.id ?? null,
    batchCode: batch?.code ?? null,
    batchName: batch?.name ?? null,
    facultyName: faculty ?? null,
    batchTiming: batch?.timeSlot ?? null,
    attendance: computeAttendanceSummary(attendances),
    fees: computeFeeSummary(s.payments || [], s.pendingFees || [], admission),
  };
};

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

  const enrollmentStatus =
    query.enrollmentStatus && query.enrollmentStatus !== "ALL"
      ? query.enrollmentStatus
      : undefined;

  // Pure faculty: teaching-desk scope may cross branches — do not pin JWT branchId.
  // CM/Counsellor: pass branchId and/or branchIds from JWT scope (spoofed query ignored).
  // Admin: optional requestedBranchId only; omit both for institute-wide.
  const params: repo.FindAllStudentsParams = {
    instituteId: scope.instituteId,
    branchId: facultyId ? undefined : scope.branchId,
    branchIds: facultyId ? undefined : scope.branchIds,
    search: query.search || undefined,
    status: query.status || undefined,
    facultyId: facultyId || undefined,
    enrollmentStatus,
    courseId: query.courseId || undefined,
    skip,
    take: limit,
  };

  const countParams = {
    instituteId: params.instituteId,
    branchId: params.branchId,
    branchIds: params.branchIds,
    search: params.search,
    status: params.status,
    facultyId: params.facultyId,
    enrollmentStatus: params.enrollmentStatus,
    courseId: params.courseId,
  };

  const [rawStudents, total] = await Promise.all([
    repo.findAllStudents(params),
    repo.countStudents(countParams),
  ]);

  const data = rawStudents.map(mapStudentSummary);

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
  // Faculty access is assignment-scoped below and may legitimately cross branches.
  if (!isPureFaculty(currentUser.roles)) {
    assertBranchRecordAccess(currentUser, student.branchId, "Student not found");
  }
  await assertFacultyCanAccessStudent(currentUser, id);

  const [attendanceRecords, assignmentSubmissions, enrollments] = await Promise.all([
    repo.findStudentAttendanceRecords(id),
    repo.findStudentAssignmentSubmissions(id),
    repo.findStudentEnrollments(id),
  ]);

  const summary = mapStudentSummary({
    ...student,
    studentAttendances: attendanceRecords,
  });

  const courseModules =
    enrollments[0]?.batch?.batchModules?.map((mod: any, index: number) => {
      const label = mod.courseModule?.name || `Module ${index + 1}`;
      let moduleStatus = "Upcoming";
      if (mod.status === "INACTIVE") moduleStatus = "Completed";
      else if (mod.status === "ACTIVE") moduleStatus = "In Progress";
      return { name: label, status: moduleStatus };
    }) ?? [];

  return {
    ...summary,
    admissions: student.admissions,
    batchEnrollments: student.batchEnrollments,
    courseModules,
    attendanceRecords: attendanceRecords.map((record: any) => ({
      id: record.id,
      status: record.status,
      markedAt: record.markedAt,
      remarks: record.remarks,
      classSession: {
        id: record.classSession.id,
        scheduledDate: record.classSession.scheduledDate,
        startTime: record.classSession.startTime,
        endTime: record.classSession.endTime,
        title:
          record.classSession.title ||
          record.classSession.batchModule?.courseModule?.name ||
          "Class Session",
      },
    })),
    assignments: assignmentSubmissions.map((sub: any) => ({
      id: sub.id,
      title: sub.assignment.title,
      dueDate: sub.assignment.dueDate,
      submittedAt: sub.submittedAt,
      marks: sub.marks,
      feedback: sub.feedback,
      maxMarks: sub.assignment.maxMarks ?? 100,
      submissionStatus: sub.submissionStatus,
      status:
        sub.submissionStatus === "GRADED" || sub.marks !== null
          ? "GRADED"
          : sub.submittedAt ||
              sub.submissionStatus === "SUBMITTED" ||
              sub.submissionStatus === "LATE"
            ? "SUBMITTED"
            : "PENDING",
    })),
    payments: (student.payments || []).map((p: any) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      amount: p.amount,
      date: p.date,
      method: p.method,
      status: p.status,
      transactionRef: p.transactionRef,
    })),
    pendingFees: student.pendingFees || [],
    whatsappNotifications: await prisma.notification.findMany({
      where: { studentId: id, instituteId: currentUser.instituteId, channel: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        event: true,
        status: true,
        createdAt: true,
        sentAt: true,
        skipReason: true,
        errorMessage: true,
      },
    }),
  };
};

import { prisma } from "../../config/database";
import { FeeRepository } from "../fees/fee.repository";
import { triggerNotification } from "../whatsapp/whatsapp.service";
import { NotificationEvent, buildIdempotencyKey } from "../whatsapp/whatsapp.constants";
import * as studentAllocationService from "./student-allocation.service";

/**
 * Create a new student (User + Student + STUDENT role + optional Course/Batch/Fee).
 */
export const createStudent = async (
  instituteId: string,
  dto: CreateStudentDto,
  currentUser: AuthUser
) => {
  // Validate branch exists
  const branch = await prisma.branch.findFirst({
    where: { id: dto.branchId, instituteId },
  });
  if (!branch) {
    throw new AppError("Selected branch not found or does not belong to this institute", 400);
  }
  // CM/Counsellor: JWT branch only. Admin may create in any institute branch.
  if (!hasBranchAccess(currentUser, dto.branchId)) {
    throw new AppError("You do not have access to create students in this branch", 403);
  }

  if (dto.batchId && dto.batchId.trim() !== "") {
    const batch = await prisma.batch.findFirst({
      where: { id: dto.batchId.trim(), instituteId },
      select: { branchId: true },
    });
    if (!batch) {
      throw new AppError("Batch not found", 404);
    }
    assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");
  }

  if (dto.courseId && dto.courseId.trim() !== "") {
    await assertCourseAvailableForBranch(instituteId, dto.courseId.trim(), dto.branchId, {
      requireActive: true,
    });
  }

  // Determine studentCode: auto-generate via SequenceService if omitted, or validate uniqueness
  let studentCode = dto.studentCode?.trim();
  const sequenceContext = { branchCode: branch.code };

  if (
    !studentCode ||
    (await SequenceService.matchesNextPreview(instituteId, "STUDENT", studentCode, sequenceContext))
  ) {
    studentCode = await SequenceService.getNextNumber(instituteId, "STUDENT", sequenceContext);
  } else {
    const existingCode = await repo.findStudentByCode(instituteId, studentCode);
    if (existingCode) {
      throw new AppError(`Student code '${studentCode}' already exists`, 409);
    }
  }

  // Duplicate check by phone only (email may be shared across family/guardian contacts).
  const normalizedPhone = (dto.phone || "").replace(/\D/g, "").slice(-10);
  if (normalizedPhone.length >= 10) {
    const usersWithPhone = await prisma.user.findMany({
      where: { instituteId, phone: { not: null } },
      select: { phone: true },
    });
    const phoneTaken = usersWithPhone.some(
      (u) => (u.phone || "").replace(/\D/g, "").slice(-10) === normalizedPhone
    );
    if (phoneTaken) {
      throw new AppError(
        "This phone number is already registered. Please enter a different phone number.",
        409
      );
    }
  }

  // Hash password for the new User (must meet institute password policy)
  await assertPasswordMeetsInstitutePolicy(instituteId, dto.password);
  const passwordHash = await hashPassword(dto.password);

  let qualification = dto.qualification || undefined;
  let qualificationMasterId: string | undefined;
  let areaMasterId: string | undefined;

  if (dto.qualificationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "education",
      masterRecordId: dto.qualificationMasterId,
      branchId: dto.branchId,
    });
    qualificationMasterId = resolved?.masterId;
    qualification = resolved?.label ?? qualification;
  }

  if (dto.areaMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId,
      entityType: "area",
      masterRecordId: dto.areaMasterId,
      branchId: dto.branchId,
    });
    areaMasterId = resolved?.masterId;
  }

  const student = await repo.createStudentWithUser({
    instituteId,
    branchId: dto.branchId,
    name: dto.name,
    email: dto.email && dto.email.trim() !== "" ? dto.email.trim() : undefined,
    phone: dto.phone && dto.phone.trim() !== "" ? dto.phone.trim() : undefined,
    passwordHash,
    studentCode,
    dateOfBirth: dto.dateOfBirth || undefined,
    gender: (dto as { gender?: string }).gender || undefined,
    qualification,
    qualificationMasterId,
    areaMasterId,
    courseId: dto.courseId || undefined,
    batchId: dto.batchId || undefined,
    totalFee: dto.totalFee,
    feePlan: dto.feePlan,
    downPayment: dto.downPayment,
  });

  // Welcome WhatsApp is triggered only from confirmed admission flows (not raw createStudent),
  // so bulk import / direct creates do not fan out messages.
  // Batch Assigned does fire when a batch is set at create time.
  if (dto.batchId && dto.batchId.trim() !== "") {
    const batchId = dto.batchId.trim();
    setImmediate(() => {
      void studentAllocationService.triggerBatchAssignedNotification(student.id, batchId);
    });
  }

  return student;
};

/**
 * Update a student's details.
 */
export const updateStudent = async (
  id: string,
  dto: UpdateStudentDto,
  currentUser: AuthUser
) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  if (dto.branchId && dto.branchId.trim() !== "") {
    if (!hasBranchAccess(currentUser, dto.branchId.trim())) {
      throw new AppError("You do not have access to move students to this branch", 403);
    }
  }

  if (dto.batchId !== undefined && dto.batchId.trim() !== "") {
    const batch = await prisma.batch.findFirst({
      where: { id: dto.batchId.trim(), instituteId: student.instituteId },
      select: { branchId: true },
    });
    if (!batch) {
      throw new AppError("Batch not found", 404);
    }
    assertBranchRecordAccess(currentUser, batch.branchId, "Batch not found");
  }

  const finalBranchId =
    dto.branchId && dto.branchId.trim() !== "" ? dto.branchId.trim() : student.branchId;
  const existingCourseId = student.admissions?.[0]?.courseId || "";
  const branchChanging =
    Boolean(dto.branchId?.trim()) && dto.branchId!.trim() !== student.branchId;

  if (dto.courseId !== undefined && dto.courseId.trim() !== "") {
    await assertCourseAvailableForBranch(
      student.instituteId,
      dto.courseId.trim(),
      finalBranchId,
      { requireActive: true }
    );
  } else if (branchChanging && existingCourseId) {
    await assertCourseAvailableForBranch(
      student.instituteId,
      existingCourseId,
      finalBranchId,
      { requireActive: true }
    );
  }

  let qualification = dto.qualification;
  let qualificationMasterId = dto.qualificationMasterId;
  let areaMasterId = dto.areaMasterId;

  if (dto.qualificationMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId: student.instituteId,
      entityType: "education",
      masterRecordId: dto.qualificationMasterId,
      branchId: student.branchId,
    });
    qualificationMasterId = resolved?.masterId;
    qualification = resolved?.label ?? qualification;
  }

  if (dto.areaMasterId) {
    const resolved = await resolveOptionalMasterFields({
      instituteId: student.instituteId,
      entityType: "area",
      masterRecordId: dto.areaMasterId,
      branchId: student.branchId,
    });
    areaMasterId = resolved?.masterId;
  }

  const previousBatchId =
    student.batchEnrollments?.find((e: { status?: string }) => e.status === "ACTIVE")?.batchId ||
    student.admissions?.[0]?.batchId ||
    null;
  const nextBatchId =
    dto.batchId !== undefined && dto.batchId.trim() !== "" ? dto.batchId.trim() : null;

  const updated = await repo.updateStudent(id, {
    ...dto,
    qualification,
    qualificationMasterId,
    areaMasterId,
  });

  // Student Details / activate flows enroll via PATCH student — not the batch enroll API.
  if (nextBatchId && nextBatchId !== previousBatchId) {
    setImmediate(() => {
      void studentAllocationService.triggerBatchAssignedNotification(id, nextBatchId);
    });
  }

  if (dto.status === "COMPLETED" && student.status !== "COMPLETED") {
    const stamp = new Date().toISOString().slice(0, 10);
    setImmediate(() => {
      void triggerNotification({
        instituteId: student.instituteId,
        studentId: id,
        event: NotificationEvent.COURSE_COMPLETED,
        idempotencyKey: buildIdempotencyKey.COURSE_COMPLETED(id, stamp),
        templateParams: {
          student_name: student.user?.name || "Student",
          course_name: student.admissions?.[0]?.course?.name || "Course",
          batch_name:
            student.batchEnrollments?.[0]?.batch?.name ||
            student.admissions?.[0]?.batch?.name ||
            "Batch",
        },
        metadata: { status: "COMPLETED" },
      }).catch(() => {});
    });
  }

  return updated;
};

/**
 * Soft-delete a student.
 */
export const deleteStudent = async (id: string) => {
  const student = await repo.findStudentById(id);
  if (!student) throw new AppError("Student not found", 404);
  return repo.softDeleteStudent(id);
};

// ΓöÇΓöÇΓöÇ Student Performance ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

  const [attendanceSummary, attendanceRecords, submissions, enrollments] = await Promise.all([
    (await import("../attendance/attendance-stats.util")).computeStudentAttendanceSummary(studentId),
    repo.findStudentAttendanceRecords(studentId),
    repo.findStudentAssignmentSubmissions(studentId),
    repo.findStudentEnrollments(studentId),
  ]);

  // Present ÷ Conducted (shared formula)
  const totalClasses = attendanceSummary.conductedCount;
  const presentCount = attendanceSummary.presentCount;
  const overallAttendancePercent = attendanceSummary.attendancePercentage;

  // ΓöÇΓöÇ 3 Consecutive Absence Check (AGENTS.md Rule 28) ΓöÇΓöÇ
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

  // ΓöÇΓöÇ Test/Assignment Scores ΓöÇΓöÇ
  const testScores = submissions
    .filter((s) => s.marks !== null)
    .map((s) => ({
      testName: s.assignment.title,
      score: s.marks!,
      maxScore: s.assignment.maxMarks ?? 100,
    }));

  // ΓöÇΓöÇ Enrolled Courses Progress ΓöÇΓöÇ
  const enrolledCourses = enrollments.flatMap((enrollment) => {
    const batch = enrollment.batch;
    const rows = getBatchCourseRows(batch);
    const subjects =
      rows.length > 0
        ? rows
        : batch.course
          ? [{ courseId: batch.courseId, course: batch.course }]
          : [];

    return subjects
      .map((row) => {
        const course = row.course ?? batch.course;
        if (!course) return null;

        const modulesForCourse = batch.batchModules.filter(
          (m) => m.courseModule?.courseId === row.courseId
        );
        const scopedModules =
          modulesForCourse.length > 0 ? modulesForCourse : batch.batchModules;
        const totalModules = scopedModules.length;
        const completedModules = scopedModules.filter((m) => m.status === "INACTIVE").length;
        const completionPercentage =
          totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return {
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          batchName: batch.name,
          batchCode: batch.code,
          completionPercentage,
          totalModules,
          completedModules,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
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

/**
 * Send Student Login Credentials (ID & default password) to the student's registered WhatsApp mobile number.
 */
export const sendStudentCredentialsWhatsAppService = async (
  studentId: string,
  currentUser: AuthUser
) => {
  const student = await repo.findStudentById(studentId);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }

  const studentName = student.user?.name || "Student";
  const admission = student.admissions?.[0];
  const studentCode = student.studentCode || admission?.admissionNo || "Not Assigned";
  const rawPhone = student.user?.phone || admission?.phone || "";

  if (!rawPhone || rawPhone.trim() === "") {
    throw new AppError("Student has no registered mobile number on record from admission.", 400);
  }

  if (!student.userId) {
    throw new AppError("This student has no login account.", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: student.userId },
    select: { passwordHash: true },
  });
  if (!existingUser) {
    throw new AppError("This student has no login account.", 400);
  }

  const temporaryPassword = generateTemporaryPassword();
  await assertPasswordMeetsInstitutePolicy(currentUser.instituteId, temporaryPassword);
  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.user.update({
    where: { id: student.userId },
    data: { passwordHash },
  });

  const portalHost = process.env.CLIENT_URL || "http://localhost:5173";
  const loginUrl = `${portalHost.replace(/\/+$/, "")}/login`;
  const stamp = new Date().toISOString();

  const restorePreviousPassword = async () => {
    await prisma.user.update({
      where: { id: student.userId! },
      data: { passwordHash: existingUser.passwordHash },
    });
  };

  try {
    const notification = await triggerNotification({
      instituteId: currentUser.instituteId,
      studentId: student.id,
      userId: student.userId,
      event: NotificationEvent.STUDENT_CREDENTIALS,
      idempotencyKey: buildIdempotencyKey.STUDENT_CREDENTIALS(student.id, stamp),
      recipientPhone: rawPhone,
      recipientName: studentName,
      templateParams: {
        student_name: studentName,
        student_code: studentCode,
        user_id: studentCode,
        login_id: studentCode,
        password: temporaryPassword,
        portal_url: loginUrl,
      },
      metadata: {
        studentId: student.id,
        manualSend: true,
      },
    });

    if (!notification || notification.status === "SKIPPED") {
      await restorePreviousPassword();
      throw new AppError(credentialsSkipMessage(notification?.skipReason), 400);
    }

    const { processWhatsappJob } = await import("../whatsapp/whatsapp.worker");
    const whatsappRepo = await import("../whatsapp/whatsapp.repository");
    await processWhatsappJob({
      id: notification.id,
      data: { notificationId: notification.id },
      attemptsMade: 1,
      opts: { attempts: 1 },
    });

    const sent = await whatsappRepo.findNotificationById(notification.id, currentUser.instituteId);
    const delivered = sent?.status === "SENT" || sent?.status === "DELIVERED" || sent?.status === "READ";
    if (!delivered) {
      await restorePreviousPassword();
      throw new AppError(sent?.errorMessage || "WhatsApp did not send the login ID and password.", 502);
    }

    return {
      success: true,
      queued: true,
      sent: true,
      notificationId: notification.id,
      status: sent.status,
      skipReason: null,
      temporaryPassword,
      recipient: {
        name: studentName,
        phone: rawPhone,
        studentCode,
      },
    };
  } catch (err) {
    if (!(err instanceof AppError)) {
      await restorePreviousPassword();
    }
    throw err;
  }
};

const credentialsSkipMessage = (reason?: string | null) => {
  switch (reason) {
    case "TEMPLATE_MISSING":
    case "TEMPLATE_INACTIVE":
      return "The WhatsApp credentials template is not active, so the message was not sent.";
    case "MSG91_NOT_CONFIGURED":
    case "PROVIDER_NOT_CONNECTED":
      return "WhatsApp is not connected, so the message was not sent.";
    case "AUTOMATION_DISABLED":
    case "GLOBAL_AUTOMATION_DISABLED":
      return "Student credentials WhatsApp is turned off, so the message was not sent.";
    case "INVALID_PHONE":
      return "The student's mobile number is not a valid WhatsApp number.";
    case "RECIPIENT_OPTED_OUT":
      return "This student has WhatsApp messages turned off.";
    default:
      return "WhatsApp did not send the login ID and password.";
  }
};

const discontinuationRiskSkipMessage = (reason?: string | null) => {
  switch (reason) {
    case "TEMPLATE_MISSING":
    case "TEMPLATE_INACTIVE":
      return "The discontinuation risk WhatsApp template is not active.";
    case "MSG91_NOT_CONFIGURED":
    case "PROVIDER_NOT_CONNECTED":
      return "WhatsApp is not connected.";
    case "AUTOMATION_DISABLED":
    case "GLOBAL_AUTOMATION_DISABLED":
      return "Discontinuation risk WhatsApp automation is turned off.";
    case "INVALID_PHONE":
      return "The student's mobile number is not a valid WhatsApp number.";
    case "RECIPIENT_OPTED_OUT":
      return "This student has WhatsApp messages turned off.";
    default:
      return "WhatsApp notification was not sent.";
  }
};

const appendAdmissionNote = (existing: string | null | undefined, reason: string): string => {
  const stamp = new Date().toISOString().slice(0, 10);
  const entry = `Discontinued (${stamp}): ${reason}`;
  if (!existing || !existing.trim()) return entry;
  return `${existing.trim()}\n${entry}`;
};

const appendContinueAdmissionNote = (
  existing: string | null | undefined,
  notes?: string | null
): string => {
  const stamp = new Date().toISOString().slice(0, 10);
  const trimmed = notes?.trim();
  const entry = trimmed ? `Continued (${stamp}): ${trimmed}` : `Continued (${stamp})`;
  if (!existing || !existing.trim()) return entry;
  return `${existing.trim()}\n${entry}`;
};

/** Pure helper: whether an INACTIVE enrollment's batch can be reactivated. */
export const canRestoreBatchEnrollment = (opts: {
  batch: { status: string; capacity: number | null } | null | undefined;
  activeEnrollmentCount: number;
}): boolean => {
  const { batch, activeEnrollmentCount } = opts;
  if (!batch) return false;
  if (batch.status === "CANCELLED" || batch.status === "COMPLETED") return false;
  if (batch.capacity != null && activeEnrollmentCount >= batch.capacity) return false;
  return true;
};

const notifyStaffDiscontinuationInApp = async (opts: {
  instituteId: string;
  branchId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  reason: string;
  batchName?: string | null;
}) => {
  const staffUsers = await prisma.user.findMany({
    where: {
      instituteId: opts.instituteId,
      status: "ACTIVE",
      OR: [
        { userRoles: { some: { role: { name: "ADMIN" } } } },
        {
          branchId: opts.branchId,
          userRoles: { some: { role: { name: "CENTER_MANAGER" } } },
        },
      ],
    },
    select: { id: true },
  });

  const title = "Student Discontinued";
  const message = `${opts.studentName} (${opts.studentCode}) was discontinued${
    opts.batchName ? ` from ${opts.batchName}` : ""
  }. Reason: ${opts.reason}`;
  const link = `/admin/students/${opts.studentId}`;

  await Promise.allSettled(
    staffUsers.map((u) =>
      prisma.notification.create({
        data: {
          instituteId: opts.instituteId,
          branchId: opts.branchId,
          userId: u.id,
          studentId: opts.studentId,
          title,
          message,
          type: "DISCONTINUATION_RISK",
          channel: "IN_APP",
          status: "DELIVERED",
          sentAt: new Date(),
          link,
          event: "STUDENT_DISCONTINUED",
          metadata: {
            studentId: opts.studentId,
            reason: opts.reason,
            module: "students",
          },
        },
      })
    )
  );
};

/**
 * Transactional discontinue: DISCONTINUED status, inactive enrollments, admission notes, notify.
 */
export const discontinueStudent = async (
  studentId: string,
  dto: DiscontinueStudentDto,
  currentUser: AuthUser
) => {
  const student = await repo.findStudentById(studentId);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  if (student.status !== "ACTIVE" && student.status !== "ON_LEAVE") {
    throw new AppError(
      `Cannot discontinue a student with status ${student.status}`,
      400
    );
  }

  const reason = dto.reason.trim();
  const now = new Date();
  const activeEnrollment = student.batchEnrollments?.[0];
  const batchName = activeEnrollment?.batch?.name ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.batchEnrollment.updateMany({
      where: { studentId, status: "ACTIVE" },
      data: { status: "INACTIVE", leftAt: now },
    });

    const admissions = await tx.admission.findMany({
      where: { studentId },
      select: { id: true, notes: true, status: true },
    });

    for (const admission of admissions) {
      if (admission.status === "CANCELLED") continue;
      await tx.admission.update({
        where: { id: admission.id },
        data: { notes: appendAdmissionNote(admission.notes, reason) },
      });
    }

    return tx.student.update({
      where: { id: studentId },
      data: { status: "DISCONTINUED" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  });

  const studentName = updated.user?.name || student.studentCode;
  setImmediate(() => {
    void notifyStaffDiscontinuationInApp({
      instituteId: student.instituteId,
      branchId: student.branchId,
      studentId,
      studentName,
      studentCode: student.studentCode,
      reason,
      batchName,
    }).catch(() => {});

    if (updated.userId) {
      void prisma.notification
        .create({
          data: {
            instituteId: student.instituteId,
            branchId: student.branchId,
            userId: updated.userId,
            studentId,
            title: "Enrollment Discontinued",
            message: `Your enrollment has been discontinued. Reason: ${reason}`,
            type: "DISCONTINUATION_RISK",
            channel: "IN_APP",
            status: "DELIVERED",
            sentAt: new Date(),
            event: "STUDENT_DISCONTINUED",
            metadata: { reason, module: "students" },
          },
        })
        .catch(() => {});
    }
  });

  return {
    id: updated.id,
    studentCode: student.studentCode,
    name: studentName,
    status: updated.status,
    phone: updated.user?.phone ?? null,
    branchId: updated.branchId,
    branch: updated.branch,
    discontinuedAt: now.toISOString(),
    reason,
    previousBatchName: batchName,
  };
};

const notifyStaffContinuationInApp = async (opts: {
  instituteId: string;
  branchId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  batchRestored: boolean;
  batchName?: string | null;
}) => {
  const staffUsers = await prisma.user.findMany({
    where: {
      instituteId: opts.instituteId,
      status: "ACTIVE",
      OR: [
        { userRoles: { some: { role: { name: "ADMIN" } } } },
        {
          branchId: opts.branchId,
          userRoles: { some: { role: { name: "CENTER_MANAGER" } } },
        },
      ],
    },
    select: { id: true },
  });

  const title = "Student Continued";
  const restorePart = opts.batchRestored
    ? opts.batchName
      ? ` and restored to ${opts.batchName}`
      : " with previous batch restored"
    : " without batch enrollment (assign via allocation)";
  const message = `${opts.studentName} (${opts.studentCode}) was continued${restorePart}.`;
  const link = `/admin/students/${opts.studentId}`;

  await Promise.allSettled(
    staffUsers.map((u) =>
      prisma.notification.create({
        data: {
          instituteId: opts.instituteId,
          branchId: opts.branchId,
          userId: u.id,
          studentId: opts.studentId,
          title,
          message,
          type: "DISCONTINUATION_RISK",
          channel: "IN_APP",
          status: "DELIVERED",
          sentAt: new Date(),
          link,
          event: "STUDENT_CONTINUED",
          metadata: {
            studentId: opts.studentId,
            batchRestored: opts.batchRestored,
            module: "students",
          },
        },
      })
    )
  );
};

/**
 * Transactional continue: DISCONTINUED → ACTIVE, optional enrollment restore, admission notes, notify.
 */
export const continueStudent = async (
  studentId: string,
  dto: ContinueStudentDto,
  currentUser: AuthUser
) => {
  const roles = (currentUser.roles || []).map((r) => String(r).toUpperCase());
  if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
    throw new AppError("Only administrators can continue a discontinued student", 403);
  }

  const student = await repo.findStudentById(studentId);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  if (student.status !== "DISCONTINUED") {
    throw new AppError(
      `Cannot continue a student with status ${student.status}`,
      400
    );
  }

  const optionalNotes = dto.notes?.trim() || undefined;

  const { updated, batchRestored, batchCode, batchName } = await prisma.$transaction(
    async (tx) => {
      let batchRestored = false;
      let batchCode: string | undefined;
      let batchName: string | null = null;

      const lastEnrollment = await tx.batchEnrollment.findFirst({
        where: { studentId, status: "INACTIVE" },
        orderBy: [{ leftAt: "desc" }, { createdAt: "desc" }],
        include: {
          batch: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              capacity: true,
              _count: {
                select: { enrollments: { where: { status: "ACTIVE" } } },
              },
            },
          },
        },
      });

      if (
        lastEnrollment &&
        canRestoreBatchEnrollment({
          batch: lastEnrollment.batch,
          activeEnrollmentCount: lastEnrollment.batch?._count.enrollments ?? 0,
        })
      ) {
        const batch = lastEnrollment.batch!;
        await tx.batchEnrollment.update({
          where: { id: lastEnrollment.id },
          data: { status: "ACTIVE", leftAt: null },
        });

        if (lastEnrollment.admissionId) {
          await tx.admission.update({
            where: { id: lastEnrollment.admissionId },
            data: { batchId: lastEnrollment.batchId },
          });
        }

        batchRestored = true;
        batchCode = batch.code;
        batchName = batch.name;
      }

      const admissions = await tx.admission.findMany({
        where: { studentId },
        select: { id: true, notes: true, status: true },
      });

      for (const admission of admissions) {
        if (admission.status === "CANCELLED") continue;
        await tx.admission.update({
          where: { id: admission.id },
          data: {
            notes: appendContinueAdmissionNote(admission.notes, optionalNotes),
          },
        });
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: { status: "ACTIVE" },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      return { updated, batchRestored, batchCode, batchName };
    }
  );

  const studentName = updated.user?.name || student.studentCode;
  setImmediate(() => {
    void notifyStaffContinuationInApp({
      instituteId: student.instituteId,
      branchId: student.branchId,
      studentId,
      studentName,
      studentCode: student.studentCode,
      batchRestored,
      batchName,
    }).catch(() => {});

    if (updated.userId) {
      const studentMessage = batchRestored
        ? batchName
          ? `Your enrollment has been continued and you have been restored to ${batchName}.`
          : "Your enrollment has been continued and your previous batch has been restored."
        : "Your enrollment has been continued. Batch assignment will follow if needed.";

      void prisma.notification
        .create({
          data: {
            instituteId: student.instituteId,
            branchId: student.branchId,
            userId: updated.userId,
            studentId,
            title: "Enrollment Continued",
            message: studentMessage,
            type: "DISCONTINUATION_RISK",
            channel: "IN_APP",
            status: "DELIVERED",
            sentAt: new Date(),
            event: "STUDENT_CONTINUED",
            metadata: { batchRestored, module: "students" },
          },
        })
        .catch(() => {});
    }
  });

  return {
    id: updated.id,
    status: updated.status,
    batchRestored,
    ...(batchCode ? { batchCode } : {}),
  };
};

/**
 * Manual WhatsApp outreach for discontinuation risk (re-sendable via manual+timestamp key).
 */
export const notifyDiscontinuationRisk = async (
  studentId: string,
  currentUser: AuthUser
) => {
  const student = await repo.findStudentById(studentId);
  if (!student) throw new AppError("Student not found", 404);
  if (student.instituteId !== currentUser.instituteId) {
    throw new AppError("Student not found", 404);
  }
  assertBranchRecordAccess(currentUser, student.branchId, "Student not found");

  const phone = student.user?.phone?.trim() || student.admissions?.[0]?.phone?.trim() || "";
  if (!phone) {
    throw new AppError("Student has no registered phone number", 400);
  }

  const enrollment = student.batchEnrollments?.[0];
  const batchId = enrollment?.batchId || student.admissions?.[0]?.batchId || "none";
  const batchName =
    enrollment?.batch?.name || student.admissions?.[0]?.batch?.name || "Batch";
  const studentName = student.user?.name || student.studentCode;

  let consecutiveAbsences = 3;
  try {
    const recent = await prisma.studentAttendance.findMany({
      where: {
        studentId,
        classSession: { sessionType: "THEORY", ...(batchId !== "none" ? { batchId } : {}) },
      },
      orderBy: { classSession: { scheduledDate: "desc" } },
      take: 15,
      select: { status: true },
    });
    let streak = 0;
    for (const record of recent) {
      if (record.status === "LEAVE") continue;
      if (record.status === "ABSENT") {
        streak++;
        continue;
      }
      break;
    }
    if (streak > 0) consecutiveAbsences = streak;
  } catch {
    // keep default
  }

  const stamp = new Date().toISOString();
  const notification = await triggerNotification({
    instituteId: currentUser.instituteId,
    studentId,
    event: NotificationEvent.DISCONTINUATION_RISK,
    idempotencyKey: `DISCONTINUATION_RISK:${studentId}:${batchId}:manual:${stamp}`,
    recipientPhone: phone,
    recipientName: studentName,
    templateParams: {
      student_name: studentName,
      batch_name: batchName,
      consecutive_absences: String(consecutiveAbsences),
    },
    metadata: {
      batchId: batchId !== "none" ? batchId : undefined,
      consecutiveAbsences,
      manualSend: true,
    },
  });

  if (!notification || notification.status === "SKIPPED") {
    throw new AppError(discontinuationRiskSkipMessage(notification?.skipReason), 400);
  }

  return {
    success: true,
    queued: true,
    notificationId: notification.id,
    status: notification.status,
    recipient: { name: studentName, phone },
    consecutiveAbsences,
    batchName,
  };
};

/**
 * Enqueue an AI call for a student (CallLog.studentId), mirroring lead AI-call.
 */
export const triggerStudentAiCall = async (
  studentId: string,
  currentUser: AuthUser
) => {
  const { AiCallingService } = await import("../ai-calling/ai-calling.service");
  return AiCallingService.triggerStudentCall(studentId, currentUser);
};

const generateTemporaryPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  const pick = (chars: string) => chars[crypto.randomInt(chars.length)] ?? "A";
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    const current = chars[i] ?? "A";
    chars[i] = chars[j] ?? "a";
    chars[j] = current;
  }
  return chars.join("");
};

/**
 * Get Student Dashboard.
 */
const asMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

/** Own pending charges and successful receipts for the student dashboard. */
const buildStudentDashboardFees = (
  pendingFees: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>
) => {
  const openPending = pendingFees.filter((fee) => asMoney(fee.dueAmount) > 0);
  const paid = payments.filter((payment) => payment.status === "SUCCESS");
  const pendingAmount = openPending.reduce((sum, fee) => sum + asMoney(fee.dueAmount), 0);
  const paidAmount = paid.reduce((sum, payment) => sum + asMoney(payment.amount), 0);

  return {
    pendingAmount: Math.round((pendingAmount + Number.EPSILON) * 100) / 100,
    paidAmount: Math.round((paidAmount + Number.EPSILON) * 100) / 100,
    pending: openPending.map((fee) => ({
      id: String(fee.id),
      feeHead: typeof fee.feeHead === "string" && fee.feeHead ? fee.feeHead : "Fee",
      dueAmount: asMoney(fee.dueAmount),
      amountPaid: asMoney(fee.amountPaid),
      dueDate: new Date(String(fee.dueDate)).toISOString(),
      status: String(fee.status),
    })),
    paid: paid.map((payment) => ({
      id: String(payment.id),
      receiptNo: String(payment.receiptNo),
      amount: asMoney(payment.amount),
      method: String(payment.method),
      date: new Date(String(payment.date)).toISOString(),
    })),
  };
};

export const getMyDashboard = async (
  currentUser: AuthUser
) => {
  const student = await prisma.student.findFirst({
    where: {
      userId: currentUser.id,
      instituteId: currentUser.instituteId,
    },

    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },

      admissions: {
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },

      batchEnrollments: {
        where: {
          status: "ACTIVE",
        },

        include: {
          batch: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },

              batchCourses: {
                orderBy: { sequence: "asc" },
                include: {
                  course: { select: { id: true, name: true, code: true } },
                },
              },

              faculty: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError(
      "Student profile not found",
      403
    );
  }

  const batchIds = student.batchEnrollments.map(
    (enrollment) => enrollment.batchId
  );

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const upcomingEnd = new Date(todayEnd);
  upcomingEnd.setDate(
    upcomingEnd.getDate() + 7
  );

  const sessionWhere = {
    status: "ACTIVE" as const,

    batchId:
      batchIds.length > 0
        ? {
            in: batchIds,
          }
        : undefined,
  };

  const studentPendingAssignmentWhere = {
    status: "ACTIVE" as const,
    OR: [
      { batchId: { in: batchIds } },
      { targets: { some: { batchId: { in: batchIds } } } },
    ],
    AND: [
      {
        OR: [
          { recipients: { none: {} } },
          { recipients: { some: { studentId: student.id } } },
        ],
      },
    ],
    submissions: {
      none: {
        studentId: student.id,
        submittedAt: { not: null },
      },
    },
  };

  const [
    todaySessions,
    upcomingSessions,
    activeLiveSessions,
    attendanceRecords,
    pendingAssignmentsCount,
    pendingAssignmentItems,
    availableRecordings,
    pendingFeeRows,
    paymentRows,
  ] = await Promise.all([
    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            scheduledDate: {
              gte: todayStart,
              lte: todayEnd,
            },
          },

          include: {
            batch: {
              include: {
                course: true,
                batchCourses: {
                  orderBy: { sequence: "asc" },
                  include: { course: { select: { id: true, name: true, code: true } } },
                },
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },

          orderBy: [
            {
              startTime: "asc",
            },
          ],
        })
      : Promise.resolve([]),

    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            scheduledDate: {
              gt: todayEnd,
              lte: upcomingEnd,
            },

            sessionStatus: {
              in: [
                "UPCOMING",
                "LIVE",
              ],
            },
          },

          include: {
            batch: {
              include: {
                course: true,
                batchCourses: {
                  orderBy: { sequence: "asc" },
                  include: { course: { select: { id: true, name: true, code: true } } },
                },
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },

          orderBy: [
            {
              scheduledDate: "asc",
            },
            {
              startTime: "asc",
            },
          ],

          take: 10,
        })
      : Promise.resolve([]),

    batchIds.length
      ? prisma.classSession.findMany({
          where: {
            ...sessionWhere,

            sessionStatus: "LIVE",
          },

          include: {
            batch: {
              include: {
                course: true,
                batchCourses: {
                  orderBy: { sequence: "asc" },
                  include: { course: { select: { id: true, name: true, code: true } } },
                },
              },
            },

            faculty: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),

    prisma.studentAttendance.findMany({
      where: {
        studentId: student.id,
      },

      include: {
        classSession: {
          select: {
            scheduledDate: true,
          },
        },
      },
    }),

    batchIds.length
      ? prisma.assignment.count({ where: studentPendingAssignmentWhere })
      : Promise.resolve(0),

    batchIds.length
      ? prisma.assignment.findMany({
          where: studentPendingAssignmentWhere,
          select: {
            id: true,
            title: true,
            dueDate: true,
            maxMarks: true,
            assignedAt: true,
            batch: { select: { id: true, name: true, code: true } },
          },
          orderBy: [{ dueDate: "asc" }, { assignedAt: "desc" }],
          take: 10,
        })
      : Promise.resolve([]),

    batchIds.length
      ? prisma.recording.count({
          where: {
            status: "ACTIVE",

            expiresAt: {
              gt: now,
            },

            classSession: {
              batchId: {
                in: batchIds,
              },
            },
          },
        })
      : Promise.resolve(0),

    FeeRepository.findPendingFeesByStudent(currentUser.instituteId, student.id),
    FeeRepository.findPaymentsByStudent(currentUser.instituteId, student.id),
  ]);

  const attendanceSummary =
    computeAttendanceSummary(
      attendanceRecords
    );

  const primaryEnrollment =
    student.batchEnrollments[0];

  const dashboardCourses = collectStudentCourses(student);

  const mapStudentDashboardSession = (session: (typeof todaySessions)[number]) => ({
    id: session.id,
    title: session.title,
    scheduledDate: session.scheduledDate,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionStatus: session.sessionStatus,
    mode: session.mode,
    meetingUrl: session.meetingUrl,
    batchId: session.batchId,
    courseId:
      session.batch?.courseId ??
      session.batch?.course?.id ??
      null,
    batch: session.batch
      ? {
          id: session.batch.id,
          code: session.batch.code,
          name: session.batch.name,
          courseId:
            session.batch.courseId ??
            session.batch.course?.id ??
            null,
        }
      : null,
    courseName:
      getSessionSubjectLabel({
        title: session.title,
        batch: session.batch,
      }) || null,
    facultyName: session.faculty?.user?.name ?? null,
  });

  return {
    profile: {
      id: student.id,

      studentCode:
        student.studentCode,

      name:
        student.user?.name ??
        null,

      email:
        student.user?.email ??
        null,
    },

    course: primaryEnrollment
      ? {
          id:
            primaryEnrollment.batch.course.id,

          name:
            primaryEnrollment.batch.course.name,

          code:
            primaryEnrollment.batch.course.code,

          batchId: primaryEnrollment.batch.id,

          batchName:
            primaryEnrollment.batch.name,

          batchCode: primaryEnrollment.batch.code,

          subjects:
            formatBatchSubjectNames(primaryEnrollment.batch),
        }
      : dashboardCourses[0]
        ? {
            id: dashboardCourses[0].id,
            name: dashboardCourses[0].name,
            code: dashboardCourses[0].code,
            batchId: null,
            batchName: null,
            batchCode: null,
            subjects: dashboardCourses.map((c) => c.name).join(", "),
          }
        : null,

    batches: student.batchEnrollments.map((be) => ({
      id: be.batch.id,
      name: be.batch.name,
      code: be.batch.code,
      courseId: be.batch.courseId ?? be.batch.course?.id ?? null,
      status: be.status,
    })),

    courses: dashboardCourses,

    instructor:
      primaryEnrollment?.batch.faculty
        ? {
            id:
              primaryEnrollment.batch.faculty.id,

            name:
              primaryEnrollment.batch.faculty.user?.name ??
              null,

            email:
              primaryEnrollment.batch.faculty.user?.email ??
              null,

            phone:
              primaryEnrollment.batch.faculty.user?.phone ??
              null,
          }
        : null,

    counts: {
      todayClasses:
        todaySessions.length,

      upcomingClasses:
        upcomingSessions.length,

      pendingAssignments: pendingAssignmentsCount,

      availableRecordings,
    },

    pendingAssignmentList: pendingAssignmentItems.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      assignedAt: a.assignedAt,
      batchName: a.batch?.name ?? null,
      batchCode: a.batch?.code ?? null,
    })),

    attendanceSummary: {
      attendancePercentage:
        attendanceSummary.overallPercentage,

      totalClasses:
        attendanceSummary.totalClasses,

      presentCount:
        attendanceSummary.presentCount,
    },

    todaySessions: todaySessions.map(mapStudentDashboardSession),

    upcomingSessions: upcomingSessions.map(mapStudentDashboardSession),

    fees: buildStudentDashboardFees(
      pendingFeeRows as Array<Record<string, unknown>>,
      paymentRows as Array<Record<string, unknown>>
    ),

    activeLiveSessions: activeLiveSessions.map((session) => ({
      id: session.id,
      title: session.title,
      meetingUrl: session.meetingUrl,
      batchId: session.batchId,
      courseId:
        session.batch?.courseId ??
        session.batch?.course?.id ??
        null,
      batch: session.batch
        ? {
            id: session.batch.id,
            code: session.batch.code,
            name: session.batch.name,
            courseId:
              session.batch.courseId ??
              session.batch.course?.id ??
              null,
          }
        : null,
      courseName:
        getSessionSubjectLabel({
          title: session.title,
          batch: session.batch,
        }) || null,
      facultyName: session.faculty?.user?.name ?? null,
    })),
  };
};
