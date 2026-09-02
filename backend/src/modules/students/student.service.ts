import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import { resolveOptionalMasterFields } from "../masters/master-resolve.service";
import { buildMeta } from "../../utils/pagination";
import { getBranchScopeFilter } from "../../utils/branch-isolation.util";
import {
  assertFacultyCanAccessStudent,
  requireFacultyIdIfPureFaculty,
} from "../../utils/auth-user.util";
import type { AuthUser } from "../auth/auth.types";
import * as repo from "./student.repository";
import type { CreateStudentDto, UpdateStudentDto, ListStudentQuery } from "./student.validation";
import { SequenceService } from "../masters/sequence.service";
import {
  formatBatchSubjectNames,
  getBatchCourseRows,
  getSessionSubjectLabel,
} from "../../utils/batch-course.util";

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
    .reduce((sum: number, p) => sum + (p.amount || 0), 0);
  const totalPendingDue = pendingFees.reduce((sum: number, f) => sum + (f.dueAmount || 0), 0);
  const calculatedTotalFee =
    pendingFees[0]?.totalFee ||
    (totalPaidFromPayments + totalPendingDue > 0 ? totalPaidFromPayments + totalPendingDue : 0);
  const finalAmountPaid =
    totalPaidFromPayments > 0 ? totalPaidFromPayments : Math.max(0, calculatedTotalFee - totalPendingDue);
  const finalDueAmount =
    totalPendingDue > 0 ? totalPendingDue : Math.max(0, calculatedTotalFee - finalAmountPaid);
  const nextDue = pendingFees.find((f) => f.dueAmount > 0);

  return {
    totalFee: calculatedTotalFee,
    discount: 0,
    finalFee: calculatedTotalFee,
    amountPaid: finalAmountPaid,
    dueAmount: finalDueAmount,
    feePlan: admission?.feePlan || "INSTALLMENT",
    status: finalDueAmount === 0 && calculatedTotalFee > 0 ? "Paid" : calculatedTotalFee === 0 ? "Pending" : "Pending",
    nextDueDate: nextDue?.dueDate ?? undefined,
  };
};

const mapStudentSummary = (s: any) => {
  const admission = s.admissions?.[0];
  const enrollment = s.batchEnrollments?.[0];
  const batch = enrollment?.batch;
  const course = batch?.course || admission?.course;
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

  return {
    id: s.id,
    userId: s.userId,
    instituteId: s.instituteId,
    branchId: s.branchId,
    studentCode: s.studentCode,
    dateOfBirth: s.dateOfBirth,
    qualification: s.qualification,
    gender,
    bloodGroup,
    guardian: guardianName || guardianPhone ? { name: guardianName, phone: guardianPhone, relation: "Parent / Guardian" } : null,
    address: addressStr ? { street: addressStr, city: s.address?.city || "Bengaluru", pincode: s.address?.pincode || "" } : null,
    status: isDraft ? "DRAFT" : s.status,
    admissionStatus: admission?.status ?? null,
    isDraft,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    user: s.user,
    displayName: s.user?.name || admission?.studentName || s.studentCode,
    branch: s.branch,
    courseName: course?.name ?? null,
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
      status: sub.marks !== null ? "GRADED" : sub.submittedAt ? "SUBMITTED" : "PENDING",
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
  };
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

  // Hash password for the new User
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
    qualification,
    qualificationMasterId,
    areaMasterId,
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

  return repo.updateStudent(id, {
    ...dto,
    qualification,
    qualificationMasterId,
    areaMasterId,
  });
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

  const [attendanceRecords, submissions, enrollments] = await Promise.all([
    repo.findStudentAttendanceRecords(studentId),
    repo.findStudentAssignmentSubmissions(studentId),
    repo.findStudentEnrollments(studentId),
  ]);

  // ΓöÇΓöÇ Attendance calculation ΓöÇΓöÇ
  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE"
  ).length;
  const overallAttendancePercent = totalClasses > 0
    ? Math.round((presentCount / totalClasses) * 100)
    : 0;

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
      maxScore: 100, // Default max; adjust if schema supports custom max
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

  const cleanPhone = rawPhone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const initialPassword = "Aadya@123";
  const portalHost = process.env.CLIENT_URL || "http://localhost:5173";
  const loginUrl = `${portalHost.replace(/\/+$/, "")}/login`;

  const messageText = `≡ƒÄô *Welcome to Aadya Institute!*

Dear *${studentName}*,

Your admission has been confirmed. Below are your Student Portal login credentials:

≡ƒåö *Student ID / Username:* \`${studentCode}\`
≡ƒöæ *Initial Password:* \`${initialPassword}\`
≡ƒîÉ *Portal URL:* ${loginUrl}

≡ƒôî *Important Instructions:*
1. Sign in to your Student Dashboard using your Student ID and Initial Password.
2. Go to *Profile* ΓåÆ *Change Password* to set your personal secure password.
3. Access your class timetables, attendance history, assignments, and recordings.

For any assistance or questions, please contact your center counsellor or manager.

Best regards,
*Aadya Institute Management*`;

  const whatsappWebUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

  return {
    success: true,
    recipient: {
      name: studentName,
      phone: rawPhone,
      formattedPhone: `+${formattedPhone}`,
      studentCode,
    },
    message: messageText,
    whatsappWebUrl,
  };
};

/**
 * Get Student Dashboard.
 */
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

  const [
    todaySessions,
    upcomingSessions,
    activeLiveSessions,
    attendanceRecords,
    pendingAssignments,
    availableRecordings,
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
      ? prisma.assignment.count({
          where: {
            batchId: {
              in: batchIds,
            },

            status: "ACTIVE",

            submissions: {
              none: {
                studentId: student.id,

                submittedAt: {
                  not: null,
                },
              },
            },
          },
        })
      : Promise.resolve(0),

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
  ]);

  const attendanceSummary =
    computeAttendanceSummary(
      attendanceRecords
    );

  const primaryEnrollment =
    student.batchEnrollments[0];

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

          batchName:
            primaryEnrollment.batch.name,

          subjects:
            formatBatchSubjectNames(primaryEnrollment.batch),
        }
      : null,

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

      pendingAssignments,

      availableRecordings,
    },

    attendanceSummary: {
      attendancePercentage:
        attendanceSummary.overallPercentage,

      totalClasses:
        attendanceSummary.totalClasses,

      presentCount:
        attendanceSummary.presentCount,
    },

    todaySessions:
      todaySessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        scheduledDate:
          session.scheduledDate,

        startTime:
          session.startTime,

        endTime:
          session.endTime,

        sessionStatus:
          session.sessionStatus,

        mode:
          session.mode,

        meetingUrl:
          session.meetingUrl,

        courseName:
          getSessionSubjectLabel({
            title: session.title,
            batch: session.batch,
          }) || null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),

    upcomingSessions:
      upcomingSessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        scheduledDate:
          session.scheduledDate,

        startTime:
          session.startTime,

        endTime:
          session.endTime,

        sessionStatus:
          session.sessionStatus,

        mode:
          session.mode,

        courseName:
          getSessionSubjectLabel({
            title: session.title,
            batch: session.batch,
          }) || null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),

    activeLiveSessions:
      activeLiveSessions.map((session) => ({
        id: session.id,

        title:
          session.title,

        meetingUrl:
          session.meetingUrl,

        courseName:
          getSessionSubjectLabel({
            title: session.title,
            batch: session.batch,
          }) || null,

        facultyName:
          session.faculty?.user?.name ??
          null,
      })),
  };
};
