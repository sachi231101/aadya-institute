import { prisma } from "../../config/database";
import type {
  StudentReportResponse,
  StudentReportFilters,
  FacultyReportResponse,
  CourseReportResponse,
  CourseReportFilters,
  FinancialReportResponse,
  ScheduleSummaryResponse,
  AdmissionsReportFilters,
} from "./report.types";
import {
  computeAssignmentCompletionRate,
  computeAvgAttendanceRate,
  computeConsecutiveTheoryAbsences,
  resolveStudentRiskFlag,
} from "./student-report.util";

/** @deprecated Prefer StudentReportFilters — kept for service import compatibility. */
export type StudentReportBranchScope = StudentReportFilters;

export class ReportRepository {
  /**
   * Get aggregated Student analytics & directory data strictly from PostgreSQL
   */
  static async getStudentReportData(
    instituteId: string,
    filters: StudentReportFilters = {}
  ): Promise<StudentReportResponse> {
    const {
      branchId,
      branchIds,
      studentIds,
      courseId,
      batchId,
      status,
      riskFlag: riskFlagFilter,
      dateFrom,
      dateTo,
    } = filters;

    const emptyDistribution = [
      { range: "90-100% Attendance", count: 0, color: "#10b981" },
      { range: "75-89% Attendance", count: 0, color: "#1769AA" },
      { range: "50-74% Attendance", count: 0, color: "#f59e0b" },
      { range: "Below 50% (Risk)", count: 0, color: "#ef4444" },
    ];

    if (studentIds && studentIds.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          avgAttendanceRate: null,
          assignmentCompletionRate: null,
          discontinuationRiskCount: 0,
        },
        enrollmentTrend: [],
        attendanceDistribution: emptyDistribution,
        courseShare: [],
        students: [],
      };
    }

    // Default ACTIVE; pass status=ALL to include every status
    const statusFilter =
      !status || status.toUpperCase() === "ACTIVE"
        ? { status: "ACTIVE" as const }
        : status.toUpperCase() === "ALL"
          ? {}
          : { status: status.toUpperCase() as "ACTIVE" | "ON_LEAVE" | "COMPLETED" | "DISCONTINUED" | "CANCELLED" };

    const students = await prisma.student.findMany({
      where: {
        instituteId,
        ...statusFilter,
        ...(studentIds
          ? { id: { in: studentIds } }
          : branchId
            ? { branchId }
            : branchIds?.length
              ? { branchId: { in: branchIds } }
              : {}),
        ...(batchId
          ? {
              batchEnrollments: {
                some: { batchId, status: "ACTIVE" },
              },
            }
          : {}),
        ...(courseId
          ? {
              OR: [
                { admissions: { some: { courseId } } },
                {
                  batchEnrollments: {
                    some: {
                      status: "ACTIVE",
                      batch: { courseId },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        admissions: {
          include: {
            course: { select: { id: true, name: true, code: true } },
            application: {
              include: {
                lead: {
                  select: {
                    createdAt: true,
                    assignedCounsellor: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        convertedFromLeads: {
          select: {
            createdAt: true,
            assignedCounsellor: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        assignmentSubmissions: {
          select: {
            assignmentId: true,
            submittedAt: true,
            submissionStatus: true,
          },
        },
        batchEnrollments: {
          where: { status: "ACTIVE" },
          select: {
            batchId: true,
            batch: {
              select: {
                id: true,
                name: true,
                courseId: true,
                course: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const allBatchIds = [
      ...new Set(students.flatMap((s) => s.batchEnrollments.map((e) => e.batchId))),
    ];

    const assignmentDateFilter =
      dateFrom || dateTo
        ? {
            assignedAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {};

    const assignmentCountsByBatch = new Map<string, number>();
    const assignmentIdsByBatch = new Map<string, Set<string>>();
    if (allBatchIds.length > 0) {
      const assignments = await prisma.assignment.findMany({
        where: {
          batchId: { in: allBatchIds },
          status: "ACTIVE",
          ...assignmentDateFilter,
        },
        select: { id: true, batchId: true },
      });
      for (const row of assignments) {
        assignmentCountsByBatch.set(
          row.batchId,
          (assignmentCountsByBatch.get(row.batchId) ?? 0) + 1
        );
        if (!assignmentIdsByBatch.has(row.batchId)) {
          assignmentIdsByBatch.set(row.batchId, new Set());
        }
        assignmentIdsByBatch.get(row.batchId)!.add(row.id);
      }
    }

    const studentIdList = students.map((s) => s.id);
    const { computeStudentAttendanceSummaries } = await import(
      "../attendance/attendance-stats.util"
    );
    const attendanceByStudent = await computeStudentAttendanceSummaries(studentIdList, {
      ...(batchId ? { batchIds: [batchId] } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });

    // Batch-fetch theory attendance for consecutive-absence streaks (full history)
    const theoryAttendances =
      studentIdList.length > 0
        ? await prisma.studentAttendance.findMany({
            where: {
              studentId: { in: studentIdList },
              classSession: { sessionType: "THEORY" },
            },
            select: {
              studentId: true,
              status: true,
              markedAt: true,
              classSession: { select: { scheduledDate: true } },
            },
            orderBy: { classSession: { scheduledDate: "desc" } },
          })
        : [];

    const theoryByStudent = new Map<
      string,
      Array<{ status: string; scheduledDate: Date; markedAt: Date }>
    >();
    for (const row of theoryAttendances) {
      if (!theoryByStudent.has(row.studentId)) {
        theoryByStudent.set(row.studentId, []);
      }
      theoryByStudent.get(row.studentId)!.push({
        status: row.status,
        scheduledDate: row.classSession.scheduledDate,
        markedAt: row.markedAt,
      });
    }

    // Last PRESENT across any session type
    const presentMarks =
      studentIdList.length > 0
        ? await prisma.studentAttendance.findMany({
            where: {
              studentId: { in: studentIdList },
              status: "PRESENT",
            },
            select: {
              studentId: true,
              markedAt: true,
              classSession: { select: { scheduledDate: true } },
            },
            orderBy: { classSession: { scheduledDate: "desc" } },
          })
        : [];
    const lastAttendedByStudent = new Map<string, string>();
    for (const row of presentMarks) {
      if (lastAttendedByStudent.has(row.studentId)) continue;
      lastAttendedByStudent.set(
        row.studentId,
        (row.classSession.scheduledDate || row.markedAt).toISOString()
      );
    }

    let totalAssignmentsAvailable = 0;
    let totalAssignmentsCompleted = 0;
    let countRange90_100 = 0;
    let countRange75_89 = 0;
    let countRange50_74 = 0;
    let countRangeBelow50 = 0;

    const extractFromNotes = (notes: string | null | undefined, pattern: RegExp): string | null => {
      if (!notes) return null;
      const match = notes.match(pattern);
      return match ? match[1].trim() : null;
    };

    const studentRows = students.map((s) => {
      const studentName = s.user?.name || `Student ${s.studentCode}`;
      const courses = s.admissions
        .map((a) =>
          a.course
            ? { id: a.course.id, name: a.course.name, code: a.course.code || undefined }
            : null
        )
        .filter((c): c is NonNullable<typeof c> => c !== null);
      const coursePackage =
        courses.length > 0 ? courses.map((c) => c.name).join(", ") : "Unassigned";
      const courseName = coursePackage;
      const branchName = s.branch?.name || "Aadya Central Branch";
      const primaryBatch = s.batchEnrollments[0]?.batch;
      const batchName = primaryBatch?.name || "—";
      const combinedNotes = s.admissions.map((a) => a.notes).filter(Boolean).join(" | ");

      const gender =
        s.gender ||
        extractFromNotes(combinedNotes, /Gender:\s*([^|\n]+)/i) ||
        null;

      const dateOfBirth = s.dateOfBirth ? s.dateOfBirth.toISOString() : null;

      let enquiryAt: Date | null = null;
      for (const lead of s.convertedFromLeads || []) {
        if (!enquiryAt || lead.createdAt < enquiryAt) enquiryAt = lead.createdAt;
      }
      for (const admission of s.admissions) {
        const leadCreatedAt = admission.application?.lead?.createdAt;
        if (leadCreatedAt && (!enquiryAt || leadCreatedAt < enquiryAt)) {
          enquiryAt = leadCreatedAt;
        }
      }
      const enquiryDate = enquiryAt ? enquiryAt.toISOString() : null;

      const counsellorFromLead = (s.convertedFromLeads || []).find(
        (lead) => lead.assignedCounsellor?.name
      )?.assignedCounsellor?.name;
      const counsellorFromAppLead = s.admissions
        .map((a) => a.application?.lead?.assignedCounsellor?.name)
        .find((name): name is string => !!name);
      const counsellorName =
        counsellorFromLead ||
        counsellorFromAppLead ||
        extractFromNotes(combinedNotes, /Counsellor:\s*([^|\n]+)/i) ||
        null;

      const stats = attendanceByStudent.get(s.id);
      const conductedCount = stats?.conductedCount ?? 0;
      const attendancePct = stats?.attendancePercentage ?? 0;
      const presentCount = stats?.presentCount ?? 0;
      const absentCount = stats?.absentCount ?? 0;
      const leaveCount = stats?.leaveCount ?? 0;

      if (attendancePct >= 90 && conductedCount > 0) countRange90_100++;
      else if (attendancePct >= 75 && conductedCount > 0) countRange75_89++;
      else if (attendancePct >= 50 && conductedCount > 0) countRange50_74++;
      else if (conductedCount > 0) countRangeBelow50++;

      const studentAssignmentIds = new Set<string>();
      for (const e of s.batchEnrollments) {
        const ids = assignmentIdsByBatch.get(e.batchId);
        if (ids) {
          for (const id of ids) studentAssignmentIds.add(id);
        }
      }
      const totalCount = s.batchEnrollments.reduce(
        (sum, e) => sum + (assignmentCountsByBatch.get(e.batchId) ?? 0),
        0
      );
      const submittedCount = s.assignmentSubmissions.filter((sub) => {
        if (studentAssignmentIds.size > 0 && !studentAssignmentIds.has(sub.assignmentId)) {
          return false;
        }
        return (
          sub.submittedAt != null ||
          sub.submissionStatus === "SUBMITTED" ||
          sub.submissionStatus === "LATE" ||
          sub.submissionStatus === "GRADED"
        );
      }).length;
      totalAssignmentsCompleted += submittedCount;
      totalAssignmentsAvailable += totalCount;

      const theoryRows = theoryByStudent.get(s.id) || [];
      const consecutiveTheoryAbsences = computeConsecutiveTheoryAbsences(theoryRows);
      const riskFlag = resolveStudentRiskFlag(
        consecutiveTheoryAbsences,
        attendancePct,
        conductedCount
      );

      return {
        id: s.id,
        studentCode: s.studentCode,
        name: studentName,
        branchId: s.branchId,
        branchName,
        batchName,
        status: s.status,
        courseName,
        coursePackage,
        courses,
        enquiryDate,
        gender,
        dateOfBirth,
        counsellorName,
        attendancePercentage: attendancePct,
        presentCount,
        absentCount,
        leaveCount,
        conductedCount,
        assignmentsSubmitted: submittedCount,
        totalAssignments: totalCount,
        consecutiveTheoryAbsences,
        lastAttendedAt: lastAttendedByStudent.get(s.id) || null,
        riskFlag,
      };
    });

    const filteredRows = riskFlagFilter
      ? studentRows.filter((row) => row.riskFlag === riskFlagFilter)
      : studentRows;

    const avgAttendance = computeAvgAttendanceRate(filteredRows);
    const assignmentCompletionRate = computeAssignmentCompletionRate(
      riskFlagFilter
        ? filteredRows.reduce((sum, r) => sum + r.assignmentsSubmitted, 0)
        : totalAssignmentsCompleted,
      riskFlagFilter
        ? filteredRows.reduce((sum, r) => sum + r.totalAssignments, 0)
        : totalAssignmentsAvailable
    );

    const discontinuationRiskCount = filteredRows.filter(
      (s) => s.consecutiveTheoryAbsences >= 2
    ).length;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const enrollmentTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const countInMonth = students.filter((s) => {
        if (riskFlagFilter) {
          const row = filteredRows.find((r) => r.id === s.id);
          if (!row) return false;
        }
        return new Date(s.createdAt) <= endOfMonth;
      }).length;
      enrollmentTrend.push({ month: mLabel, students: countInMonth });
    }

    // Recalculate distribution from filtered rows
    let f90 = 0;
    let f75 = 0;
    let f50 = 0;
    let fBelow = 0;
    for (const row of filteredRows) {
      if (row.conductedCount <= 0) continue;
      if (row.attendancePercentage >= 90) f90++;
      else if (row.attendancePercentage >= 75) f75++;
      else if (row.attendancePercentage >= 50) f50++;
      else fBelow++;
    }

    const attendanceDistribution = [
      { range: "90-100% Attendance", count: riskFlagFilter ? f90 : countRange90_100, color: "#10b981" },
      { range: "75-89% Attendance", count: riskFlagFilter ? f75 : countRange75_89, color: "#1769AA" },
      { range: "50-74% Attendance", count: riskFlagFilter ? f50 : countRange50_74, color: "#f59e0b" },
      { range: "Below 50% (Risk)", count: riskFlagFilter ? fBelow : countRangeBelow50, color: "#ef4444" },
    ];

    const courseMap = new Map<string, number>();
    const studentsForShare = riskFlagFilter
      ? students.filter((s) => filteredRows.some((r) => r.id === s.id))
      : students;
    studentsForShare.forEach((s) => {
      const names = s.admissions
        .map((a) => a.course?.name)
        .filter((n): n is string => !!n);
      if (names.length === 0) {
        courseMap.set("Unassigned", (courseMap.get("Unassigned") || 0) + 1);
      } else {
        names.forEach((cName) => {
          courseMap.set(cName, (courseMap.get(cName) || 0) + 1);
        });
      }
    });

    const colors = ["#1769AA", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6"];
    let colorIdx = 0;
    const courseShare = Array.from(courseMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: colors[colorIdx++ % colors.length],
    }));

    return {
      summary: {
        totalStudents: filteredRows.length,
        avgAttendanceRate: avgAttendance,
        assignmentCompletionRate,
        discontinuationRiskCount,
      },
      enrollmentTrend,
      attendanceDistribution,
      courseShare,
      students: filteredRows,
    };
  }

  /**
   * Get aggregated Faculty analytics & directory data strictly from PostgreSQL
   */
  static async getFacultyReportData(
    instituteId: string,
    filters: import("./report.types").FacultyReportFilters | string = {}
  ): Promise<FacultyReportResponse> {
    const scope =
      typeof filters === "string" ? { branchId: filters } : filters || {};
    const { branchId, branchIds, status } = scope;
    const whereBranch = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : {};

    const faculty = await prisma.faculty.findMany({
      where: {
        instituteId,
        ...whereBranch,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        batches: {
          where: { status: { in: ["ACTIVE", "UPCOMING"] } },
          select: {
            id: true,
            name: true,
            _count: { select: { enrollments: true } },
          },
        },
        batchCourses: {
          where: { status: "ACTIVE" },
          select: {
            batchId: true,
            batch: {
              select: {
                id: true,
                name: true,
                status: true,
                _count: { select: { enrollments: true } },
              },
            },
          },
        },
        classSessions: {
          where: { status: "ACTIVE" },
          select: { id: true, startTime: true, endTime: true, status: true, scheduledDate: true },
        },
      },
    });
    const totalActiveFaculty = faculty.filter((f) => f.status === "ACTIVE").length;

    // Fetch Feedback ratings from database — per faculty
    const feedbacksPerFaculty = await prisma.feedback.groupBy({
      by: ["facultyId"],
      where: {
        facultyId: { in: faculty.map((f) => f.id) },
      },
      _avg: { rating: true },
      _count: { rating: true },
      _sum: { rating: true },
    });
    const feedbackMap = new Map(
      feedbacksPerFaculty
        .filter((fb) => fb.facultyId !== null)
        .map((fb) => [fb.facultyId!, fb])
    );

    // Also compute global avg for summary
    const allFeedbacks = await prisma.feedback.findMany({
      where: {
        classSession: {
          batch: {
            instituteId,
            ...whereBranch,
          },
        },
      },
      select: { rating: true },
    });

    let totalRatingSum = 0;
    let rating5 = 0;
    let rating4 = 0;
    let rating3 = 0;
    let ratingBelow3 = 0;

    allFeedbacks.forEach((fb) => {
      totalRatingSum += fb.rating;
      if (fb.rating === 5) rating5++;
      else if (fb.rating === 4) rating4++;
      else if (fb.rating === 3) rating3++;
      else ratingBelow3++;
    });

    const avgStudentRating = allFeedbacks.length > 0 ? Number((totalRatingSum / allFeedbacks.length).toFixed(1)) : 0;

    // Fetch Class Sessions for Session Compliance calculation
    const allClassSessions = await prisma.classSession.findMany({
      where: {
        batch: {
          instituteId,
          ...whereBranch,
        },
      },
      select: { id: true, status: true, sessionStatus: true, startTime: true, endTime: true },
    });

    const completedSessions = allClassSessions.filter((cs) => cs.sessionStatus === "COMPLETED").length;

    const sessionCompliancePercentage =
      allClassSessions.length > 0 ? Math.round((completedSessions / allClassSessions.length) * 100) : 0;

    // Collect all unique batch IDs across faculty for student attendance computation
    const allFacultyBatchIds = new Set<string>();
    faculty.forEach((f) => {
      f.batches.forEach((b) => allFacultyBatchIds.add(b.id));
      f.batchCourses.forEach((bc) => allFacultyBatchIds.add(bc.batchId));
    });

    // Fetch student attendance stats per batch (for avgStudentAttendancePct)
    const batchAttendanceMap = new Map<string, { present: number; total: number }>();
    if (allFacultyBatchIds.size > 0) {
      const attendanceStats = await prisma.studentAttendance.groupBy({
        by: ["classSessionId", "status"],
        where: {
          classSession: {
            batchId: { in: Array.from(allFacultyBatchIds) },
            status: "ACTIVE",
          },
        },
        _count: { _all: true },
      });

      // Map classSessionId -> batchId
      const sessionBatchMap = new Map<string, string>();
      const sessionsForAttendance = await prisma.classSession.findMany({
        where: {
          batchId: { in: Array.from(allFacultyBatchIds) },
          status: "ACTIVE",
        },
        select: { id: true, batchId: true },
      });
      sessionsForAttendance.forEach((s) => sessionBatchMap.set(s.id, s.batchId));

      attendanceStats.forEach((stat) => {
        const batchIdKey = sessionBatchMap.get(stat.classSessionId);
        if (!batchIdKey) return;
        const current = batchAttendanceMap.get(batchIdKey) || { present: 0, total: 0 };
        current.total += stat._count._all;
        if (stat.status === "PRESENT") {
          current.present += stat._count._all;
        }
        batchAttendanceMap.set(batchIdKey, current);
      });
    }

    // Fetch faculty daily attendance % (PRESENT / PRESENT+ABSENT+LEAVE)
    const facultyDailyPctMap = new Map<string, number>();
    const facultyDailyCountedMap = new Map<string, number>();
    if (faculty.length > 0) {
      const dailyGrouped = await prisma.facultyDailyAttendance.groupBy({
        by: ["facultyId", "status"],
        where: {
          facultyId: { in: faculty.map((f) => f.id) },
          status: { in: ["PRESENT", "ABSENT", "LEAVE"] },
        },
        _count: { _all: true },
      });
      const dailyCounts = new Map<string, { present: number; counted: number }>();
      for (const row of dailyGrouped) {
        const current = dailyCounts.get(row.facultyId) || { present: 0, counted: 0 };
        current.counted += row._count._all;
        if (row.status === "PRESENT") current.present += row._count._all;
        dailyCounts.set(row.facultyId, current);
      }
      for (const f of faculty) {
        const c = dailyCounts.get(f.id);
        facultyDailyCountedMap.set(f.id, c?.counted ?? 0);
        facultyDailyPctMap.set(
          f.id,
          c && c.counted > 0 ? Math.round((c.present / c.counted) * 100) : 0
        );
      }
    }

    const parseSessionHours = (startTime?: string | null, endTime?: string | null): number => {
      const parse = (value?: string | null): number | null => {
        if (!value) return null;
        const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
        if (!match) return null;
        return Number(match[1]) + Number(match[2]) / 60;
      };
      const start = parse(startTime);
      const end = parse(endTime);
      if (start == null || end == null || end <= start) return 2;
      return end - start;
    };

    let totalMonthlyTeachingHours = 0;
    const workloadList: { name: string; hours: number; batches: number }[] = [];

    // Compute weekly hours based on sessions in the current week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7)); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const facultyRows = faculty.map((f) => {
      const name = f.user?.name || `Faculty ${f.employeeCode}`;
      const batchIds = new Set<string>();
      f.batches.forEach((b) => batchIds.add(b.id));
      f.batchCourses.forEach((bc) => batchIds.add(bc.batchId));
      const batchesCount = batchIds.size;

      // Total students across all assigned batches (deduplicated via batch)
      let totalStudents = 0;
      const countedBatchIds = new Set<string>();
      f.batches.forEach((b) => {
        if (!countedBatchIds.has(b.id)) {
          totalStudents += b._count.enrollments;
          countedBatchIds.add(b.id);
        }
      });
      f.batchCourses.forEach((bc) => {
        if (!countedBatchIds.has(bc.batchId) && bc.batch) {
          totalStudents += bc.batch._count.enrollments;
          countedBatchIds.add(bc.batchId);
        }
      });

      // Average student attendance percentage across assigned batches
      let totalPresent = 0;
      let totalAttendanceRecords = 0;
      batchIds.forEach((bId) => {
        const stats = batchAttendanceMap.get(bId);
        if (stats) {
          totalPresent += stats.present;
          totalAttendanceRecords += stats.total;
        }
      });
      const avgStudentAttendancePct =
        totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 0;
      const facultyAttendancePct = facultyDailyPctMap.get(f.id) ?? 0;

      // Compute total teaching hours and weekly workload
      let hours = 0;
      let weeklyHours = 0;
      f.classSessions.forEach((cs) => {
        const sessionHours = parseSessionHours(cs.startTime, cs.endTime);
        hours += sessionHours;
        if (cs.scheduledDate) {
          const sessionDate = new Date(cs.scheduledDate);
          if (sessionDate >= weekStart && sessionDate <= weekEnd) {
            weeklyHours += sessionHours;
          }
        }
      });
      hours = Math.round(hours);
      weeklyHours = Math.round(weeklyHours);
      const workloadHoursPerWeek = weeklyHours > 0 ? weeklyHours : (hours > 0 ? Math.round(hours / 4) : 0);
      totalMonthlyTeachingHours += hours;

      // Faculty-specific rating
      const facultyFeedback = feedbackMap.get(f.id);
      const facultyAvgRating = facultyFeedback?._avg?.rating
        ? Number(facultyFeedback._avg.rating.toFixed(1))
        : 0;

      workloadList.push({
        name,
        hours,
        batches: batchesCount,
      });

      return {
        id: f.id,
        facultyCode: f.employeeCode,
        employeeCode: f.employeeCode,
        name,
        branchName: f.branch?.name || "Unknown",
        specialization: f.specialization || "Unspecified",
        assignedBatchesCount: batchesCount,
        totalStudents,
        avgStudentAttendancePct,
        facultyAttendancePct,
        teachingHours: hours,
        workloadHoursPerWeek,
        avgRating: facultyAvgRating,
        status: f.status,
        _dailyAttendanceCount: facultyDailyCountedMap.get(f.id) ?? 0,
        _feedbackCount: facultyFeedback?._count?.rating ?? 0,
      };
    });

    const ratingDistribution = [
      { rating: "5 Stars (Excellent)", count: rating5, color: "#10b981" },
      { rating: "4 Stars (Good)", count: rating4, color: "#1769AA" },
      { rating: "3 Stars (Average)", count: rating3, color: "#f59e0b" },
      { rating: "Below 3 Stars", count: ratingBelow3, color: "#ef4444" },
    ];

    const lowRating = facultyRows
      .filter((f) => f._feedbackCount > 0 && f.avgRating > 0 && f.avgRating < 3)
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        label: `${f.name} (${f.facultyCode})`,
        meta: `${f.avgRating}/5 rating · ${f.branchName}`,
        count: f._feedbackCount,
      }));

    const lowAttendance = facultyRows
      .filter((f) => f._dailyAttendanceCount > 0 && f.facultyAttendancePct < 75)
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        label: `${f.name} (${f.facultyCode})`,
        meta: `${f.facultyAttendancePct}% faculty attendance · ${f.branchName}`,
        count: f._dailyAttendanceCount,
      }));

    const unassigned = facultyRows
      .filter((f) => f.status === "ACTIVE" && f.assignedBatchesCount === 0)
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        label: `${f.name} (${f.facultyCode})`,
        meta: `No active batches · ${f.specialization}`,
        count: 0,
      }));

    const cleanedFaculty = facultyRows.map(({ _dailyAttendanceCount, _feedbackCount, ...row }) => row);

    return {
      summary: {
        totalActiveFaculty,
        avgStudentRating,
        monthlyTeachingHours: totalMonthlyTeachingHours,
        sessionCompliancePercentage,
      },
      workload: workloadList,
      ratingDistribution,
      faculty: cleanedFaculty,
      needsAttention: {
        lowRating,
        lowAttendance,
        unassigned,
      },
    };
  }

  /**
   * Get aggregated Course analytics & directory data strictly from PostgreSQL.
   * Courses are institute-scoped; branch filters scope batch/enrollment/capacity metrics.
   */
  static async getCourseReportData(
    instituteId: string,
    filters: CourseReportFilters = {}
  ): Promise<CourseReportResponse> {
    const { branchId, branchIds, status, category } = filters;
    const whereBranch = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : {};

    const activeEnrollmentWhere = {
      status: "ACTIVE" as const,
      leftAt: null,
    };

    const courseBranchVisibility = branchId
      ? { courseBranches: { some: { branchId } } }
      : branchIds?.length
        ? { courseBranches: { some: { branchId: { in: branchIds } } } }
        : {};

    const courses = await prisma.course.findMany({
      where: {
        instituteId,
        ...courseBranchVisibility,
        ...(status
          ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED" }
          : { status: { not: "DELETED" } }),
        ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      },
      include: {
        modules: { select: { id: true } },
        batches: {
          where: { ...whereBranch },
          include: {
            enrollments: { where: activeEnrollmentWhere, select: { id: true } },
          },
        },
        batchCourses: {
          where: {
            status: "ACTIVE",
            ...(Object.keys(whereBranch).length
              ? { batch: whereBranch }
              : {}),
          },
          include: {
            batch: {
              include: {
                enrollments: { where: activeEnrollmentWhere, select: { id: true } },
              },
            },
          },
        },
        admissions: {
          where: {
            ...whereBranch,
            status: { in: ["CONFIRMED", "PROVISIONAL", "COMPLETED"] },
          },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const CATEGORY_COLORS = [
      "#2563EB",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ef4444",
      "#06b6d4",
      "#ec4899",
      "#64748b",
    ];

    const uniqueActiveBatchIds = new Set<string>();
    let totalCapacity = 0;
    let totalEnrolled = 0;
    let batchSeatEnrolled = 0;
    let totalModules = 0;
    const categoryCounts = new Map<string, number>();

    const courseRows = courses.map((c) => {
      const batchMap = new Map<
        string,
        (typeof c.batches)[number] | NonNullable<(typeof c.batchCourses)[number]["batch"]>
      >();
      for (const b of c.batches || []) {
        batchMap.set(b.id, b);
      }
      for (const bc of c.batchCourses || []) {
        if (bc.batch) batchMap.set(bc.batch.id, bc.batch);
      }
      const cBatches = Array.from(batchMap.values());
      const activeBatchesForCourse = cBatches.filter((b) => b.status === "ACTIVE");
      activeBatchesForCourse.forEach((b) => uniqueActiveBatchIds.add(b.id));

      let cEnrolled = 0;
      let cCapacity = 0;
      let fromBatches = false;

      if (cBatches.length > 0) {
        fromBatches = true;
        cBatches.forEach((b) => {
          cEnrolled += b.enrollments?.length || 0;
          cCapacity += b.capacity || 0;
        });
      } else {
        // No in-scope batches: fall back to confirmed-style admissions in branch scope
        cEnrolled = c.admissions.length;
      }

      totalEnrolled += cEnrolled;
      totalCapacity += cCapacity;
      if (fromBatches) batchSeatEnrolled += cEnrolled;

      const mCount = c.modules?.length || 0;
      totalModules += mCount;

      const cat = c.category || "General";
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

      const availableSeats = Math.max(0, cCapacity - cEnrolled);
      const occupancyPct =
        cCapacity > 0 ? Math.round((cEnrolled / cCapacity) * 100) : 0;

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        category: cat,
        durationMonths: c.duration || 0,
        modulesCount: mCount,
        enrolledStudents: cEnrolled,
        capacity: cCapacity,
        availableSeats,
        occupancyPct,
        batchesCount: cBatches.length,
        activeBatchesCount: activeBatchesForCourse.length,
        status: c.status,
      };
    });

    const activeBatches = uniqueActiveBatchIds.size;
    const avgOccupancy =
      totalCapacity > 0 ? Math.round((batchSeatEnrolled / totalCapacity) * 100) : 0;

    const enrollmentComparison = courseRows.map((row) => ({
      course: row.code || row.name,
      students: row.enrolledStudents,
      capacity: row.capacity,
      available: row.availableSeats,
      occupancyPct: row.occupancyPct,
    }));

    const categoryBreakdown = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count], index) => ({
        category: cat,
        count,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));

    const noModules = courseRows
      .filter((c) => c.modulesCount === 0)
      .map((c) => ({
        id: c.id,
        label: `${c.code} — ${c.name}`,
        meta: c.category,
        count: 0,
      }));

    const zeroEnrollment = courseRows
      .filter((c) => c.status === "ACTIVE" && c.enrolledStudents === 0)
      .map((c) => ({
        id: c.id,
        label: `${c.code} — ${c.name}`,
        meta: c.batchesCount > 0 ? `${c.batchesCount} batch(es), 0 enrolled` : "No in-scope batches",
        count: 0,
      }));

    const overCapacity = courseRows
      .filter((c) => c.capacity > 0 && c.enrolledStudents > c.capacity)
      .map((c) => ({
        id: c.id,
        label: `${c.code} — ${c.name}`,
        meta: `${c.enrolledStudents} enrolled / ${c.capacity} capacity (${c.occupancyPct}%)`,
        count: c.enrolledStudents - c.capacity,
      }));

    return {
      summary: {
        totalCourses: courseRows.length,
        activeBatches,
        avgBatchOccupancy: avgOccupancy,
        totalModules,
        totalEnrolledStudents: totalEnrolled,
      },
      enrollmentComparison,
      categoryBreakdown,
      structureOverview: [],
      courses: courseRows,
      needsAttention: {
        noModules,
        zeroEnrollment,
        overCapacity,
      },
    };
  }

  /**
   * Revenue & Finance report — demand / collected / outstanding from PendingFee + Payment.
   * Refunds / gateway reconciliation / payment links are not first-class yet (empty + notes).
   * Concession is estimated from Admission.concessionHeadMaster percentage metadata.
   */
  static async getFinancialReportData(
    instituteId: string,
    filters: import("./report.types").FinancialReportFilters | string = {}
  ): Promise<FinancialReportResponse> {
    const scope =
      typeof filters === "string" ? { branchId: filters } : filters || {};
    const {
      branchId,
      branchIds,
      academicYear,
      dateFrom,
      dateTo,
      courseId,
      batchId,
      studentId,
      feeHeadMasterId,
      paymentModeMasterId,
      paymentStatus,
      counsellorId,
      transactionType,
      outstandingFilter,
      trendGranularity = "monthly",
    } = scope;

    const whereBranch = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : {};

    const parseAcademicYearRange = (label?: string): { start: Date; end: Date } | null => {
      if (!label) return null;
      const m = label.match(/^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/);
      if (!m) return null;
      const startYear = Number(m[1]);
      const endRaw = m[2];
      const endYear =
        endRaw.length === 2 ? 2000 + Number(endRaw) : Number(endRaw);
      // Indian academic year: Apr 1 → Mar 31
      return {
        start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)),
        end: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59)),
      };
    };

    const ayRange = parseAcademicYearRange(academicYear);
    const rangeStart = dateFrom
      ? new Date(`${dateFrom}T00:00:00.000Z`)
      : ayRange?.start;
    const rangeEnd = dateTo
      ? new Date(`${dateTo}T23:59:59.999Z`)
      : ayRange?.end;

    const ONLINE_METHODS = new Set(["UPI", "NET_BANKING", "CARD"]);
    const METHOD_COLORS: Record<string, string> = {
      UPI: "#10b981",
      NET_BANKING: "#1769AA",
      CARD: "#8b5cf6",
      CASH: "#f59e0b",
      CHEQUE: "#ef4444",
    };
    const FALLBACK_COLORS = ["#10b981", "#1769AA", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

    const humanizeMethod = (method: string | null | undefined) => {
      const code = (method || "").toUpperCase();
      if (code === "UPI") return "UPI / QR Code";
      if (code === "NET_BANKING") return "Net Banking (NEFT/RTGS)";
      if (code === "CARD") return "Credit / Debit Card";
      if (code === "CASH") return "Cash";
      if (code === "CHEQUE") return "Cheque";
      if (!method) return "Unknown";
      return method.replace(/_/g, " ");
    };

    const money = (v: unknown) => Number(v || 0);

    // Counsellor → converted admissions
    let counsellorAdmissionIds: string[] | null = null;
    if (counsellorId) {
      const leads = await prisma.lead.findMany({
        where: {
          instituteId,
          assignedCounsellorId: counsellorId,
          convertedAdmissionId: { not: null },
        },
        select: { convertedAdmissionId: true },
      });
      counsellorAdmissionIds = leads
        .map((l) => l.convertedAdmissionId)
        .filter((id): id is string => !!id);
      if (counsellorAdmissionIds.length === 0) {
        counsellorAdmissionIds = ["__none__"];
      }
    }

    const admissionRelationFilter: Record<string, unknown> = {};
    if (courseId) admissionRelationFilter.courseId = courseId;
    if (batchId) admissionRelationFilter.batchId = batchId;
    if (counsellorAdmissionIds) {
      admissionRelationFilter.id = { in: counsellorAdmissionIds };
    }
    // Align with Admissions report cohort: notes tag and/or admissionDate in AY window
    if (academicYear) {
      admissionRelationFilter.OR = [
        {
          notes: {
            contains: `Academic year: ${academicYear}`,
            mode: "insensitive",
          },
        },
        { notes: { contains: academicYear, mode: "insensitive" } },
        ...(ayRange
          ? [
              {
                admissionDate: {
                  gte: ayRange.start,
                  lte: ayRange.end,
                },
              },
            ]
          : []),
      ];
    }

    let courseNameFallback: string[] = [];
    if (courseId) {
      const courseRows = await prisma.course.findMany({
        where: { id: courseId },
        select: { name: true },
      });
      courseNameFallback = courseRows.map((c) => c.name);
    }

    const statusFilter = paymentStatus
      ? { status: paymentStatus.toUpperCase() }
      : transactionType === "VOID"
        ? { status: "VOID" }
        : transactionType === "FAILED"
          ? { status: "FAILED" }
          : transactionType === "PENDING"
            ? { status: "PENDING" }
            : { status: "SUCCESS" };

    const paymentWhere: Record<string, unknown> = {
      instituteId,
      ...whereBranch,
      ...statusFilter,
      ...(studentId ? { studentId } : {}),
      ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
      ...(paymentModeMasterId ? { paymentModeMasterId } : {}),
      ...(rangeStart || rangeEnd
        ? {
            date: {
              ...(rangeStart ? { gte: rangeStart } : {}),
              ...(rangeEnd ? { lte: rangeEnd } : {}),
            },
          }
        : {}),
      ...(Object.keys(admissionRelationFilter).length
        ? {
            OR: [
              { admission: admissionRelationFilter },
              ...(courseId && courseNameFallback.length
                ? [{ admissionId: null, courseName: { in: courseNameFallback } }]
                : []),
            ],
          }
        : {}),
    };

    // Outstanding/demand: do not over-restrict by payment date range on open dues
    const pendingWhere: Record<string, unknown> = {
      instituteId,
      ...whereBranch,
      ...(studentId ? { studentId } : {}),
      ...(feeHeadMasterId ? { feeHeadMasterId } : {}),
      ...(Object.keys(admissionRelationFilter).length
        ? { admission: admissionRelationFilter }
        : {}),
    };

    const [
      payments,
      pendingFees,
      paymentModeMasters,
      feeHeadMasters,
      branches,
      courses,
      batches,
      academicYears,
      counsellors,
      voidFailedPending,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere as any,
        include: {
          paymentModeMaster: { select: { id: true, name: true, code: true } },
          feeHeadMaster: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true } },
          admission: {
            select: {
              id: true,
              admissionNo: true,
              studentId: true,
              courseId: true,
              batchId: true,
              concessionHeadMasterId: true,
              concessionHeadMaster: { select: { id: true, name: true, data: true } },
              course: { select: { id: true, name: true, code: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.pendingFee.findMany({
        where: pendingWhere as any,
        include: {
          feeHeadMaster: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true } },
          admission: {
            select: {
              id: true,
              admissionNo: true,
              studentId: true,
              courseId: true,
              batchId: true,
              concessionHeadMasterId: true,
              concessionHeadMaster: { select: { id: true, name: true, data: true } },
              course: { select: { id: true, name: true, code: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          student: {
            select: {
              id: true,
              studentCode: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.masterRecord.findMany({
        where: { instituteId, entityType: "paymentmodes", status: "ACTIVE" },
        select: { id: true, name: true, code: true },
      }),
      prisma.masterRecord.findMany({
        where: { instituteId, entityType: "feeheads", status: "ACTIVE" },
        select: { id: true, name: true, code: true },
      }),
      prisma.branch.findMany({
        where: {
          instituteId,
          ...(branchId
            ? { id: branchId }
            : branchIds?.length
              ? { id: { in: branchIds } }
              : {}),
        },
        select: { id: true, name: true },
      }),
      prisma.course.findMany({
        where: {
          instituteId,
          status: { not: "DELETED" },
          ...(branchId
            ? { courseBranches: { some: { branchId } } }
            : branchIds?.length
              ? { courseBranches: { some: { branchId: { in: branchIds } } } }
              : {}),
        },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.batch.findMany({
        where: {
          instituteId,
          ...whereBranch,
          ...(courseId ? { courseId } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 200,
      }),
      prisma.masterRecord.findMany({
        where: { instituteId, entityType: "academicyear", status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "desc" },
      }),
      prisma.user.findMany({
        where: {
          instituteId,
          userRoles: { some: { role: { name: "COUNSELLOR" } } },
          status: "ACTIVE",
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      prisma.payment.findMany({
        where: {
          instituteId,
          ...whereBranch,
          status: { in: ["VOID", "FAILED", "PENDING"] },
          ...(rangeStart || rangeEnd
            ? {
                date: {
                  ...(rangeStart ? { gte: rangeStart } : {}),
                  ...(rangeEnd ? { lte: rangeEnd } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          status: true,
          amount: true,
          studentName: true,
          admissionNo: true,
          receiptNo: true,
          date: true,
          notes: true,
          transactionRef: true,
        },
        orderBy: { date: "desc" },
        take: 100,
      }),
    ]);

    const mastersByCode = new Map(
      paymentModeMasters
        .filter((m) => m.code)
        .map((m) => [(m.code || "").toUpperCase(), m])
    );

    const successPayments = payments.filter((p) => p.status === "SUCCESS");
    const totalCollected = successPayments.reduce((s, p) => s + money(p.amount), 0);

    // Fee demand = sum of installment line totals (already net of provision-time concession)
    const totalFeeDemand = pendingFees.reduce((s, pf) => s + money(pf.totalFee), 0);
    const totalPending = pendingFees
      .filter((pf) => money(pf.dueAmount) > 0)
      .reduce((s, pf) => s + money(pf.dueAmount), 0);

    // Estimate concession from admission concession head %
    const estimateConcession = (
      netAmount: number,
      head: { name: string; data: unknown } | null | undefined
    ) => {
      if (!head || netAmount <= 0) return 0;
      const data = head.data as { percentage?: string | number } | null;
      const pct = Number(data?.percentage);
      if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return 0;
      return Math.round((netAmount / (1 - pct / 100) - netAmount) * 100) / 100;
    };

    const concessionByAdmission = new Map<
      string,
      { amount: number; head: string; branchName: string; courseName: string; studentName: string; admissionNo: string }
    >();
    const admissionsSeen = new Set<string>();
    for (const pf of pendingFees) {
      const adm = pf.admission;
      if (!adm?.id || admissionsSeen.has(adm.id)) continue;
      admissionsSeen.add(adm.id);
      const net = pendingFees
        .filter((x) => x.admissionId === adm.id)
        .reduce((s, x) => s + money(x.totalFee), 0);
      const amt = estimateConcession(net, adm.concessionHeadMaster);
      if (amt > 0) {
        concessionByAdmission.set(adm.id, {
          amount: amt,
          head: adm.concessionHeadMaster?.name || "Concession",
          branchName: pf.branch?.name || "Unassigned",
          courseName: adm.course?.name || pf.courseName,
          studentName: pf.studentName,
          admissionNo: pf.admissionNo,
        });
      }
    }
    const totalConcession = Array.from(concessionByAdmission.values()).reduce(
      (s, c) => s + c.amount,
      0
    );

    const totalRefunds = 0; // no Refund model yet
    const voidedAmount = voidFailedPending
      .filter((p) => p.status === "VOID")
      .reduce((s, p) => s + money(p.amount), 0);
    const failedAmount = voidFailedPending
      .filter((p) => p.status === "FAILED")
      .reduce((s, p) => s + money(p.amount), 0);
    const pendingPaymentAmount = voidFailedPending
      .filter((p) => p.status === "PENDING")
      .reduce((s, p) => s + money(p.amount), 0);

    const netRevenue = totalCollected - totalRefunds;
    const projectedRevenue = totalCollected + totalPending;
    // Efficiency vs open dues (never misleadingly >100 from partial demand coverage)
    const collectionRate =
      totalCollected + totalPending > 0
        ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
        : 0;

    // --- Trends ---
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrend: import("./report.types").MonthlyFinancialItem[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthCollected = successPayments
        .filter((p) => {
          const pDate = p.date ? new Date(p.date) : new Date(p.createdAt);
          return pDate >= startOfMonth && pDate <= endOfMonth;
        })
        .reduce((sum, p) => sum + money(p.amount), 0);

      const monthDemand = pendingFees
        .filter((pf) => {
          const pfDate = new Date(pf.createdAt);
          return pfDate >= startOfMonth && pfDate <= endOfMonth;
        })
        .reduce((sum, pf) => sum + money(pf.totalFee), 0);

      const monthPending = pendingFees
        .filter((pf) => money(pf.dueAmount) > 0)
        .filter((pf) => {
          const due = new Date(pf.dueDate);
          return due >= startOfMonth && due <= endOfMonth;
        })
        .reduce((sum, pf) => sum + money(pf.dueAmount), 0);

      const monthConcession = Array.from(concessionByAdmission.values()).length
        ? 0
        : 0; // concession attributed at admission time — skip monthly split for accuracy

      const base = monthDemand > 0 ? monthDemand : monthCollected + monthPending;
      monthlyTrend.push({
        month: mLabel,
        demand: monthDemand,
        collected: monthCollected,
        pending: monthPending,
        refunds: 0,
        concession: monthConcession,
        netCollection: monthCollected,
        collectionRate: base > 0 ? Math.round((monthCollected / base) * 100) : 0,
      });
    }

    // Yearly trend (last 4 calendar years)
    const yearlyMap = new Map<number, { collected: number; demand: number; pending: number }>();
    for (let y = now.getFullYear() - 3; y <= now.getFullYear(); y++) {
      yearlyMap.set(y, { collected: 0, demand: 0, pending: 0 });
    }
    successPayments.forEach((p) => {
      const y = new Date(p.date || p.createdAt).getFullYear();
      const row = yearlyMap.get(y);
      if (row) row.collected += money(p.amount);
    });
    pendingFees.forEach((pf) => {
      const y = new Date(pf.createdAt).getFullYear();
      const row = yearlyMap.get(y);
      if (row) {
        row.demand += money(pf.totalFee);
        if (money(pf.dueAmount) > 0) row.pending += money(pf.dueAmount);
      }
    });
    const yearlyEntries = Array.from(yearlyMap.entries()).sort((a, b) => a[0] - b[0]);
    const yearlyTrend = yearlyEntries.map(([year, row], idx) => {
      const base = row.demand > 0 ? row.demand : row.collected + row.pending;
      const prev = idx > 0 ? yearlyEntries[idx - 1][1].collected : null;
      const growthPct =
        prev != null && prev > 0
          ? Math.round(((row.collected - prev) / prev) * 100)
          : null;
      return {
        year: String(year),
        collected: row.collected,
        demand: row.demand,
        pending: row.pending,
        collectionRate: base > 0 ? Math.round((row.collected / base) * 100) : 0,
        growthPct,
      };
    });

    // Daily collection (last 30 days or filtered range)
    const dailyStart =
      rangeStart ||
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const dailyEnd = rangeEnd || now;
    const dailyMap = new Map<string, { transactions: number; collected: number }>();
    successPayments.forEach((p) => {
      const d = new Date(p.date || p.createdAt);
      if (d < dailyStart || d > dailyEnd) return;
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key) || { transactions: 0, collected: 0 };
      row.transactions += 1;
      row.collected += money(p.amount);
      dailyMap.set(key, row);
    });
    const dailyCollection = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, row]) => ({
        date,
        transactions: row.transactions,
        collected: row.collected,
        refunds: 0,
        netCollection: row.collected,
      }));

    // Payment method share
    const methodTotals = new Map<
      string,
      { name: string; code: string; value: number; count: number; channel: "ONLINE" | "OFFLINE" | "OTHER" }
    >();
    successPayments.forEach((p) => {
      const methodCode = (p.method || "").toUpperCase();
      const master =
        p.paymentModeMaster ||
        (methodCode ? mastersByCode.get(methodCode) : undefined);
      const code = (master?.code || p.method || "OTHER").toUpperCase();
      const name = master?.name || humanizeMethod(p.method);
      const key = master?.id || code;
      const channel: "ONLINE" | "OFFLINE" | "OTHER" = ONLINE_METHODS.has(code)
        ? "ONLINE"
        : code === "CASH" || code === "CHEQUE"
          ? "OFFLINE"
          : "OTHER";
      const existing = methodTotals.get(key) ?? {
        name,
        code,
        value: 0,
        count: 0,
        channel,
      };
      existing.value += money(p.amount);
      existing.count += 1;
      if (master?.name) existing.name = master.name;
      methodTotals.set(key, existing);
    });
    const paymentMethodShare = Array.from(methodTotals.values())
      .filter((m) => m.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((m, index) => ({
        name: m.name,
        value: m.value,
        count: m.count,
        percentage:
          totalCollected > 0 ? Math.round((m.value / totalCollected) * 100) : 0,
        channel: m.channel,
        color: METHOD_COLORS[m.code] || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      }));

    const channelAgg = new Map<string, { amount: number; count: number }>();
    paymentMethodShare.forEach((m) => {
      const row = channelAgg.get(m.channel) || { amount: 0, count: 0 };
      row.amount += m.value;
      row.count += m.count;
      channelAgg.set(m.channel, row);
    });
    const channelShare = Array.from(channelAgg.entries()).map(([channel, row]) => ({
      channel,
      amount: row.amount,
      count: row.count,
      percentage:
        totalCollected > 0 ? Math.round((row.amount / totalCollected) * 100) : 0,
    }));

    // Fee head breakdown
    const feeHeadMap = new Map<
      string,
      { feeHeadMasterId: string; feeHead: string; demand: number; collected: number; pending: number }
    >();
    pendingFees.forEach((pf) => {
      const key = pf.feeHeadMasterId || pf.feeHead || "unknown";
      const row = feeHeadMap.get(key) || {
        feeHeadMasterId: pf.feeHeadMasterId,
        feeHead: pf.feeHeadMaster?.name || pf.feeHead || "Unknown",
        demand: 0,
        collected: 0,
        pending: 0,
      };
      row.demand += money(pf.totalFee);
      row.collected += money(pf.amountPaid);
      row.pending += money(pf.dueAmount);
      feeHeadMap.set(key, row);
    });
    const feeHeadBreakdown = Array.from(feeHeadMap.values()).sort(
      (a, b) => b.demand - a.demand
    );

    // Branch breakdown
    const branchMap = new Map<
      string,
      { branchId: string; branchName: string; demand: number; collected: number; pending: number }
    >();
    const ensureBranch = (id: string | null | undefined, name?: string | null) => {
      const key = id || "__none__";
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          branchId: key,
          branchName: name || branches.find((b) => b.id === id)?.name || "Unassigned",
          demand: 0,
          collected: 0,
          pending: 0,
        });
      }
      return branchMap.get(key)!;
    };
    successPayments.forEach((p) => {
      const row = ensureBranch(p.branchId, p.branch?.name);
      row.collected += money(p.amount);
    });
    pendingFees.forEach((pf) => {
      const row = ensureBranch(pf.branchId, pf.branch?.name);
      row.demand += money(pf.totalFee);
      row.pending += money(pf.dueAmount);
    });
    const branchBreakdown = Array.from(branchMap.values())
      .filter((b) => b.branchId !== "__none__" || b.demand + b.collected + b.pending > 0)
      .map((b) => {
        const base = b.demand > 0 ? b.demand : b.collected + b.pending;
        return {
          ...b,
          collectionRate: base > 0 ? Math.round((b.collected / base) * 100) : 0,
        };
      })
      .sort((a, b) => b.collected - a.collected);

    // Course / batch breakdown
    const courseMap = new Map<
      string,
      {
        courseId: string | null;
        courseName: string;
        studentIds: Set<string>;
        demand: number;
        collected: number;
        pending: number;
        concession: number;
      }
    >();
    const batchMap = new Map<
      string,
      {
        batchId: string | null;
        batchName: string;
        studentIds: Set<string>;
        demand: number;
        collected: number;
        pending: number;
      }
    >();

    pendingFees.forEach((pf) => {
      const cId = pf.admission?.courseId || null;
      const cName = pf.admission?.course?.name || pf.courseName || "Unassigned";
      const cKey = cId || cName;
      const cRow = courseMap.get(cKey) || {
        courseId: cId,
        courseName: cName,
        studentIds: new Set<string>(),
        demand: 0,
        collected: 0,
        pending: 0,
        concession: 0,
      };
      cRow.demand += money(pf.totalFee);
      cRow.collected += money(pf.amountPaid);
      cRow.pending += money(pf.dueAmount);
      if (pf.studentId) cRow.studentIds.add(pf.studentId);
      courseMap.set(cKey, cRow);

      const bId = pf.admission?.batchId || null;
      const bName = pf.admission?.batch?.name || "Unassigned";
      const bKey = bId || bName;
      const bRow = batchMap.get(bKey) || {
        batchId: bId,
        batchName: bName,
        studentIds: new Set<string>(),
        demand: 0,
        collected: 0,
        pending: 0,
      };
      bRow.demand += money(pf.totalFee);
      bRow.collected += money(pf.amountPaid);
      bRow.pending += money(pf.dueAmount);
      if (pf.studentId) bRow.studentIds.add(pf.studentId);
      batchMap.set(bKey, bRow);
    });

    concessionByAdmission.forEach((c) => {
      for (const row of courseMap.values()) {
        if (row.courseName === c.courseName) row.concession += c.amount;
      }
    });

    const courseBreakdown = Array.from(courseMap.values())
      .map((c) => {
        const base = c.demand > 0 ? c.demand : c.collected + c.pending;
        return {
          courseId: c.courseId,
          courseName: c.courseName,
          students: c.studentIds.size,
          demand: c.demand,
          collected: c.collected,
          pending: c.pending,
          concession: c.concession,
          collectionRate: base > 0 ? Math.round((c.collected / base) * 100) : 0,
        };
      })
      .sort((a, b) => b.demand - a.demand);

    const batchBreakdown = Array.from(batchMap.values())
      .map((b) => {
        const base = b.demand > 0 ? b.demand : b.collected + b.pending;
        return {
          batchId: b.batchId,
          batchName: b.batchName,
          students: b.studentIds.size,
          demand: b.demand,
          collected: b.collected,
          pending: b.pending,
          collectionRate: base > 0 ? Math.round((b.collected / base) * 100) : 0,
        };
      })
      .sort((a, b) => b.demand - a.demand);

    // Outstanding students
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 7);

    let outstandingStudents = pendingFees
      .filter((pf) => money(pf.dueAmount) > 0)
      .map((pf) => ({
        id: pf.id,
        studentId: pf.studentId || pf.admission?.studentId || pf.student?.id || null,
        studentName: pf.studentName,
        admissionNo: pf.admissionNo,
        courseName: pf.admission?.course?.name || pf.courseName,
        batchName: pf.admission?.batch?.name || null,
        totalFee: money(pf.totalFee),
        paid: money(pf.amountPaid),
        pending: money(pf.dueAmount),
        dueDate: pf.dueDate.toISOString(),
        status: pf.status,
        overdueDays: pf.overdueDays || 0,
      }));

    if (outstandingFilter) {
      const f = outstandingFilter.toUpperCase();
      outstandingStudents = outstandingStudents.filter((o) => {
        const due = new Date(o.dueDate);
        if (f === "OVERDUE") return o.status === "OVERDUE" || due < today;
        if (f === "DUE_SOON") return o.status === "DUE_SOON" || (due >= today && due <= soon);
        if (f === "PENDING") return o.status === "DUE_SOON" || o.paid === 0;
        if (f === "PARTIALLY_PAID" || f === "PARTIAL") return o.status === "PARTIAL" || (o.paid > 0 && o.pending > 0);
        return true;
      });
    }
    outstandingStudents.sort((a, b) => b.pending - a.pending);

    // Aging buckets from dueDate
    const aging = {
      "0–30 Days": { amount: 0, count: 0 },
      "31–60 Days": { amount: 0, count: 0 },
      "61–90 Days": { amount: 0, count: 0 },
      "90+ Days": { amount: 0, count: 0 },
    };
    pendingFees
      .filter((pf) => money(pf.dueAmount) > 0)
      .forEach((pf) => {
        const days =
          pf.overdueDays > 0
            ? pf.overdueDays
            : Math.max(
                0,
                Math.floor((today.getTime() - new Date(pf.dueDate).getTime()) / 86400000)
              );
        const amt = money(pf.dueAmount);
        if (days <= 30) {
          aging["0–30 Days"].amount += amt;
          aging["0–30 Days"].count += 1;
        } else if (days <= 60) {
          aging["31–60 Days"].amount += amt;
          aging["31–60 Days"].count += 1;
        } else if (days <= 90) {
          aging["61–90 Days"].amount += amt;
          aging["61–90 Days"].count += 1;
        } else {
          aging["90+ Days"].amount += amt;
          aging["90+ Days"].count += 1;
        }
      });
    const agingBuckets = Object.entries(aging).map(([bucket, row]) => ({
      bucket,
      amount: row.amount,
      count: row.count,
    }));

    // Concession breakdown
    const concByHead = new Map<string, number>();
    const concByBranch = new Map<string, number>();
    const concByCourse = new Map<string, number>();
    const concByStudent: Array<{ studentName: string; admissionNo: string; amount: number }> = [];
    concessionByAdmission.forEach((c) => {
      concByHead.set(c.head, (concByHead.get(c.head) || 0) + c.amount);
      concByBranch.set(c.branchName, (concByBranch.get(c.branchName) || 0) + c.amount);
      concByCourse.set(c.courseName, (concByCourse.get(c.courseName) || 0) + c.amount);
      concByStudent.push({
        studentName: c.studentName,
        admissionNo: c.admissionNo,
        amount: c.amount,
      });
    });

    const recorderIds = [
      ...new Set(
        successPayments
          .map((p) => p.recordedById)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];
    const recorderNameById = new Map<string, string>();
    if (recorderIds.length > 0) {
      const recorders = await prisma.user.findMany({
        where: { id: { in: recorderIds } },
        select: { id: true, name: true },
      });
      recorders.forEach((u) => recorderNameById.set(u.id, u.name));
    }

    const recentPayments = successPayments.slice(0, 100).map((p) => {
      const methodCode = (p.method || "").toUpperCase();
      const master =
        p.paymentModeMaster ||
        (methodCode ? mastersByCode.get(methodCode) : undefined);
      return {
        id: p.id,
        receiptNo: p.receiptNo,
        studentName: p.studentName,
        admissionNo: p.admissionNo,
        courseName: p.admission?.course?.name || p.courseName,
        branchName: p.branch?.name || null,
        feeHead: p.feeHeadMaster?.name || p.feeHead || null,
        amount: money(p.amount),
        date: (p.date || p.createdAt).toISOString(),
        method: master?.name || humanizeMethod(p.method),
        gateway: ONLINE_METHODS.has(methodCode) ? methodCode : null,
        transactionRef: p.transactionRef,
        status: p.status,
        collectedBy: p.recordedById
          ? recorderNameById.get(p.recordedById) || p.recordedById
          : null,
        studentId: p.studentId || p.admission?.studentId || p.student?.id || null,
        admissionId: p.admissionId,
        receiptPdfUrl: p.receiptPdfUrl,
      };
    });

    const highOutstanding = outstandingStudents
      .filter((o) => o.pending >= 10000)
      .slice(0, 20)
      .map((o) => ({
        id: o.id,
        label: o.studentName,
        meta: `${o.admissionNo} · ₹${o.pending.toLocaleString("en-IN")} pending`,
        count: 1,
        amount: o.pending,
      }));

    const overdueFees = outstandingStudents
      .filter((o) => o.status === "OVERDUE" || new Date(o.dueDate) < today)
      .slice(0, 20)
      .map((o) => ({
        id: o.id,
        label: o.studentName,
        meta: `Overdue ${o.overdueDays}d · ₹${o.pending.toLocaleString("en-IN")}`,
        count: 1,
        amount: o.pending,
      }));

    const partiallyPaid = outstandingStudents
      .filter((o) => o.paid > 0 && o.pending > 0)
      .slice(0, 20)
      .map((o) => ({
        id: o.id,
        label: o.studentName,
        meta: `Paid ₹${o.paid.toLocaleString("en-IN")} · Due ₹${o.pending.toLocaleString("en-IN")}`,
        count: 1,
        amount: o.pending,
      }));

    const failedPayments = voidFailedPending
      .filter((p) => p.status === "FAILED")
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        label: p.studentName,
        meta: `${p.receiptNo} · ₹${money(p.amount).toLocaleString("en-IN")}`,
        count: 1,
        amount: money(p.amount),
      }));

    const voidedPayments = voidFailedPending
      .filter((p) => p.status === "VOID")
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        label: p.studentName,
        meta: `${p.receiptNo} · ₹${money(p.amount).toLocaleString("en-IN")}`,
        count: 1,
        amount: money(p.amount),
      }));

    const monthlyBreakdown =
      trendGranularity === "yearly"
        ? yearlyTrend.map((y) => ({
            month: y.year,
            demand: y.demand,
            collected: y.collected,
            pending: y.pending,
            refunds: 0,
            concession: 0,
            netCollection: y.collected,
            collectionRate: y.collectionRate,
          }))
        : monthlyTrend;

    return {
      summary: {
        totalFeeDemand,
        totalCollected,
        totalPending,
        collectionRate,
        totalConcession,
        totalRefunds,
        netRevenue,
        projectedRevenue,
        voidedAmount,
        failedAmount,
      },
      monthlyTrend,
      yearlyTrend,
      paymentMethodShare,
      channelShare,
      monthlyBreakdown,
      dailyCollection,
      feeHeadBreakdown,
      branchBreakdown,
      courseBreakdown,
      batchBreakdown,
      outstandingStudents: outstandingStudents.slice(0, 200),
      agingBuckets,
      concessionBreakdown: {
        total: totalConcession,
        byHead: Array.from(concByHead.entries()).map(([head, amount]) => ({ head, amount })),
        byBranch: Array.from(concByBranch.entries()).map(([branchName, amount]) => ({
          branchName,
          amount,
        })),
        byCourse: Array.from(concByCourse.entries()).map(([courseName, amount]) => ({
          courseName,
          amount,
        })),
        byStudent: concByStudent.sort((a, b) => b.amount - a.amount).slice(0, 50),
      },
      refundReport: {
        totalRefunds: 0,
        refundCount: 0,
        items: [],
        note: "Refund ledger is not enabled yet. Voided payments are tracked separately under Needs Attention.",
      },
      reconciliation: {
        gatewayAmount: successPayments
          .filter((p) => ONLINE_METHODS.has((p.method || "").toUpperCase()))
          .reduce((s, p) => s + money(p.amount), 0),
        erpAmount: totalCollected,
        matched: totalCollected,
        unmatched: 0,
        failed: failedAmount,
        pending: pendingPaymentAmount,
        voided: voidedAmount,
        note: "Gateway settlement matching is not wired. Online vs ERP uses payment method classification only.",
      },
      recentPayments,
      needsAttention: {
        overdueFees,
        highOutstanding,
        failedPayments,
        voidedPayments,
        partiallyPaid,
        unreconciled: [],
        refundsAwaiting: [],
        expiredLinks: [],
      },
      filterOptions: {
        courses: courses.map((c) => ({ id: c.id, name: c.name, code: c.code })),
        batches: batches.map((b) => ({ id: b.id, name: b.name })),
        feeHeads: feeHeadMasters.map((f) => ({ id: f.id, name: f.name })),
        paymentModes: paymentModeMasters.map((m) => ({ id: m.id, name: m.name })),
        counsellors: counsellors.map((c) => ({ id: c.id, name: c.name })),
        academicYears: academicYears.map((y) => ({ id: y.id, name: y.name })),
      },
    };
  }

  static async getScheduleSummaryData(
    instituteId: string,
    branchId?: string
  ): Promise<ScheduleSummaryResponse> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const upcomingEnd = new Date(todayEnd);
    upcomingEnd.setDate(upcomingEnd.getDate() + 7);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - ((now.getDay() + 6) % 7));
    const expiringBefore = new Date(now);
    expiringBefore.setDate(expiringBefore.getDate() + 7);

    const sessionWhere = {
      status: "ACTIVE" as const,
      batch: {
        instituteId,
        ...(branchId ? { branchId } : {}),
      },
      ...(branchId ? { branchId } : {}),
    };

    const [
      todayClasses,
      upcomingClasses,
      liveClasses,
      completedThisWeek,
      recordingsExpiringSoon,
      todaySessionsRaw,
    ] = await Promise.all([
      prisma.classSession.count({
        where: {
          ...sessionWhere,
          scheduledDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.classSession.count({
        where: {
          ...sessionWhere,
          scheduledDate: { gt: todayEnd, lte: upcomingEnd },
          sessionStatus: "UPCOMING",
        },
      }),
      prisma.classSession.count({
        where: {
          ...sessionWhere,
          sessionStatus: "LIVE",
        },
      }),
      prisma.classSession.count({
        where: {
          ...sessionWhere,
          sessionStatus: "COMPLETED",
          scheduledDate: { gte: weekStart, lte: todayEnd },
        },
      }),
      prisma.recording.count({
        where: {
          status: "ACTIVE",
          expiresAt: { lte: expiringBefore, gte: now },
          classSession: {
            batch: {
              instituteId,
              ...(branchId ? { branchId } : {}),
            },
          },
        },
      }),
      prisma.classSession.findMany({
        where: {
          ...sessionWhere,
          scheduledDate: { gte: todayStart, lte: todayEnd },
        },
        include: {
          batch: { select: { name: true } },
          faculty: { select: { user: { select: { name: true } } } },
        },
        orderBy: [{ startTime: "asc" }],
        take: 10,
      }),
    ]);

    return {
      todayClasses,
      upcomingClasses,
      liveClasses,
      completedThisWeek,
      discontinuationRiskCount: 0,
      recordingsExpiringSoon,
      todaySessions: todaySessionsRaw.map((s) => ({
        id: s.id,
        title: s.title,
        scheduledDate: s.scheduledDate,
        startTime: s.startTime,
        endTime: s.endTime,
        sessionStatus: s.sessionStatus,
        batchName: s.batch?.name ?? null,
        facultyName: s.faculty?.user?.name ?? null,
      })),
    };
  }

  static async getAdmissionsReportData(
    instituteId: string,
    filters: AdmissionsReportFilters = {}
  ): Promise<import("./report.types").AdmissionsReportResponse> {
    const {
      branchId,
      branchIds,
      academicYear,
      dateFrom,
      dateTo,
      courseId,
      batchId,
      status,
      counsellorId,
      leadSource,
    } = filters;
    const branchFilter = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : {};
    const startDate = dateFrom
      ? new Date(`${dateFrom}T00:00:00.000Z`)
      : undefined;
    const endDate = dateTo
      ? new Date(`${dateTo}T23:59:59.999Z`)
      : undefined;

    const [admissionCandidates, selectedCounsellor, selectedLeadSource] =
      await Promise.all([
      prisma.admission.findMany({
        where: {
          instituteId,
          ...branchFilter,
          ...(courseId ? { courseId } : {}),
          ...(batchId ? { batchId } : {}),
          ...(status ? { status } : {}),
          ...(academicYear
            ? {
                notes: {
                  contains: `Academic year: ${academicYear}`,
                  mode: "insensitive",
                },
              }
            : {}),
          ...(startDate || endDate
            ? {
                admissionDate: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              }
            : {}),
        },
        include: {
          course: { select: { id: true, name: true, code: true } },
          branch: { select: { name: true } },
          batch: {
            select: {
              id: true,
              name: true,
              capacity: true,
              _count: {
                select: {
                  enrollments: {
                    where: { status: "ACTIVE", leftAt: null },
                  },
                },
              },
            },
          },
          student: {
            select: {
              id: true,
              user: { select: { name: true } },
              admissions: {
                where: {
                  instituteId,
                  ...branchFilter,
                },
                select: {
                  course: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          application: {
            select: {
              lead: {
                select: {
                  source: true,
                  assignedCounsellorId: true,
                  assignedCounsellor: { select: { name: true } },
                  createdAt: true,
                },
              },
            },
          },
          convertedFromLeads: {
            select: {
              source: true,
              stage: true,
              assignedCounsellorId: true,
              assignedCounsellor: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: [{ admissionDate: "desc" }, { createdAt: "desc" }],
      }),
      counsellorId
        ? prisma.user.findFirst({
            where: { id: counsellorId, instituteId },
            select: { name: true },
          })
        : Promise.resolve(null),
      leadSource
        ? prisma.masterRecord.findFirst({
            where: {
              instituteId,
              entityType: "leadsource",
              OR: [
                { name: { equals: leadSource, mode: "insensitive" } },
                { code: { equals: leadSource, mode: "insensitive" } },
              ],
            },
            select: { name: true, code: true },
          })
        : Promise.resolve(null),
      ]);

    const extractNoteValue = (
      notes: string | null | undefined,
      label: string
    ): string | null => {
      if (!notes) return null;
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = notes.match(new RegExp(`${escaped}:\\s*([^|\\n]+)`, "i"));
      return match?.[1]?.trim() || null;
    };
    const equalsIgnoreCase = (
      left: string | null | undefined,
      right: string | null | undefined
    ): boolean =>
      !!left &&
      !!right &&
      left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
    const matchesLeadSource = (
      candidate: string | null | undefined
    ): boolean =>
      !leadSource ||
      [leadSource, selectedLeadSource?.name, selectedLeadSource?.code].some(
        (accepted) => equalsIgnoreCase(candidate, accepted)
      );

    const getCounsellor = (admission: (typeof admissionCandidates)[number]) => {
      const convertedLead = admission.convertedFromLeads.find(
        (lead) => lead.assignedCounsellorId || lead.assignedCounsellor?.name
      );
      const applicationLead = admission.application?.lead;
      return {
        id:
          convertedLead?.assignedCounsellorId ||
          applicationLead?.assignedCounsellorId ||
          undefined,
        name:
          convertedLead?.assignedCounsellor?.name ||
          applicationLead?.assignedCounsellor?.name ||
          extractNoteValue(admission.notes, "Counsellor"),
      };
    };

    const getLeadSource = (
      admission: (typeof admissionCandidates)[number]
    ): string | null =>
      admission.convertedFromLeads.find((lead) => lead.source)?.source ||
      admission.application?.lead?.source ||
      extractNoteValue(admission.notes, "Lead source");

    const admissions = admissionCandidates.filter((admission) => {
      if (academicYear) {
        const noteAcademicYear = extractNoteValue(
          admission.notes,
          "Academic year"
        );
        if (!equalsIgnoreCase(noteAcademicYear, academicYear)) return false;
      }
      if (counsellorId) {
        const counsellor = getCounsellor(admission);
        const matchesById = counsellor.id === counsellorId;
        const matchesLegacyNote = equalsIgnoreCase(
          counsellor.name,
          selectedCounsellor?.name
        );
        if (!matchesById && !matchesLegacyNote) return false;
      }
      if (!matchesLeadSource(getLeadSource(admission))) {
        return false;
      }
      return true;
    });

    const admissionIds = admissions.map((admission) => admission.id);
    const studentIds = [
      ...new Set(
        admissions
          .map((admission) => admission.studentId)
          .filter((id): id is string => !!id)
      ),
    ];
    const allowedBranchIds = branchId
      ? [branchId]
      : branchIds?.length
        ? branchIds
        : null;
    const isBranchAllowed = (candidateBranchId: string | null): boolean =>
      !allowedBranchIds ||
      (!!candidateBranchId && allowedBranchIds.includes(candidateBranchId));

    const [leadCandidates, applicationCandidates, pendingFees, documents] =
      await Promise.all([
        prisma.lead.findMany({
          where: {
            instituteId,
            ...(branchId
              ? { branchId }
              : branchIds?.length
                ? { branchId: { in: branchIds } }
                : {}),
            status: { not: "ARCHIVED" },
            ...(courseId ? { courseId } : {}),
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
          select: {
            id: true,
            stage: true,
            source: true,
            assignedCounsellorId: true,
          },
        }),
        prisma.application.findMany({
          where: {
            instituteId,
            ...(courseId ? { courseId } : {}),
            ...(startDate || endDate
              ? {
                  submittedDate: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
          select: {
            id: true,
            branchId: true,
            notes: true,
            lead: {
              select: {
                branchId: true,
                source: true,
                assignedCounsellorId: true,
                assignedCounsellor: { select: { name: true } },
              },
            },
          },
        }),
        admissionIds.length || studentIds.length
          ? prisma.pendingFee.findMany({
              where: {
                instituteId,
                dueAmount: { gt: 0 },
                OR: [
                  ...(admissionIds.length
                    ? [{ admissionId: { in: admissionIds } }]
                    : []),
                  ...(studentIds.length
                    ? [{ studentId: { in: studentIds } }]
                    : []),
                ],
              },
              select: {
                id: true,
                admissionId: true,
                studentId: true,
                dueAmount: true,
                dueDate: true,
                status: true,
              },
            })
          : Promise.resolve([]),
        admissionIds.length || studentIds.length
          ? prisma.document.findMany({
              where: {
                instituteId,
                status: { in: ["PENDING", "REJECTED"] },
                OR: [
                  ...(admissionIds.length
                    ? [
                        {
                          entityType: "ADMISSION" as const,
                          entityId: { in: admissionIds },
                        },
                      ]
                    : []),
                  ...(studentIds.length
                    ? [
                        {
                          entityType: "STUDENT" as const,
                          entityId: { in: studentIds },
                        },
                      ]
                    : []),
                ],
              },
              select: {
                id: true,
                entityType: true,
                entityId: true,
                name: true,
                status: true,
              },
            })
          : Promise.resolve([]),
      ]);

    const filteredLeads = leadCandidates.filter(
      (lead) =>
        (!counsellorId || lead.assignedCounsellorId === counsellorId) &&
        matchesLeadSource(lead.source)
    );
    const filteredApplications = applicationCandidates.filter((application) => {
      const applicationBranchId =
        application.branchId ||
        application.lead?.branchId ||
        null;
      if (!isBranchAllowed(applicationBranchId)) return false;
      if (counsellorId) {
        const assignedId = application.lead?.assignedCounsellorId;
        const assignedName =
          application.lead?.assignedCounsellor?.name ||
          extractNoteValue(application.notes, "Counsellor");
        if (
          assignedId !== counsellorId &&
          !equalsIgnoreCase(assignedName, selectedCounsellor?.name)
        ) {
          return false;
        }
      }
      const source =
        application.lead?.source ||
        extractNoteValue(application.notes, "Lead source");
      return matchesLeadSource(source);
    });

    const totalAdmissions = admissions.length;
    const confirmedAdmissions = admissions.filter(
      (admission) =>
        admission.status === "CONFIRMED" || admission.status === "ACTIVE"
    ).length;
    const provisionalAdmissions = admissions.filter(
      (admission) =>
        admission.status === "PROVISIONAL" || admission.status === "PENDING"
    ).length;
    const cancelledAdmissions = admissions.filter(
      (admission) => admission.status === "CANCELLED"
    ).length;

    const courseMap = new Map<string, number>();
    const branchMap = new Map<string, number>();
    const counsellorMap = new Map<
      string,
      { id?: string; name: string; count: number }
    >();
    const leadSourceMap = new Map<string, number>();
    const batchAdmissionMap = new Map<string, number>();

    for (const admission of admissions) {
      const courseName = admission.course?.name || "Unknown";
      courseMap.set(courseName, (courseMap.get(courseName) || 0) + 1);
      const branchName = admission.branch?.name || "Unknown";
      branchMap.set(branchName, (branchMap.get(branchName) || 0) + 1);

      const counsellor = getCounsellor(admission);
      const counsellorName = counsellor.name || "Unassigned";
      const counsellorKey = counsellor.id || counsellorName;
      const existingCounsellor = counsellorMap.get(counsellorKey);
      counsellorMap.set(counsellorKey, {
        id: counsellor.id,
        name: counsellorName,
        count: (existingCounsellor?.count || 0) + 1,
      });

      const source = getLeadSource(admission) || "Unknown";
      leadSourceMap.set(source, (leadSourceMap.get(source) || 0) + 1);
      if (admission.batchId) {
        batchAdmissionMap.set(
          admission.batchId,
          (batchAdmissionMap.get(admission.batchId) || 0) + 1
        );
      }
    }

    const now = new Date();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyTrendStart =
      startDate || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyTrendEnd = endDate || now;
    const monthlyTrend: Array<{ month: string; admissions: number }> = [];
    const monthCursor = new Date(
      monthlyTrendStart.getFullYear(),
      monthlyTrendStart.getMonth(),
      1
    );
    const lastTrendMonth = new Date(
      monthlyTrendEnd.getFullYear(),
      monthlyTrendEnd.getMonth(),
      1
    );
    while (monthCursor <= lastTrendMonth) {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      monthlyTrend.push({
        month: `${monthNames[month]} ${year}`,
        admissions: admissions.filter((admission) => {
          const admissionDate = admission.admissionDate || admission.createdAt;
          return (
            admissionDate.getFullYear() === year &&
            admissionDate.getMonth() === month
          );
        }).length,
      });
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    const yearlyTrend = Array.from({ length: 5 }, (_, index) => {
      const year = now.getFullYear() - (4 - index);
      return {
        year: String(year),
        admissions: admissions.filter((admission) => {
          const admissionDate = admission.admissionDate || admission.createdAt;
          return admissionDate.getFullYear() === year;
        }).length,
      };
    });

    const touchedBatchIds = [...batchAdmissionMap.keys()];
    const batches =
      courseId && !batchId && touchedBatchIds.length === 0
        ? []
        : await prisma.batch.findMany({
            where: {
              instituteId,
              ...(branchId
                ? { branchId }
                : branchIds?.length
                  ? { branchId: { in: branchIds } }
                  : {}),
              ...(batchId
                ? { id: batchId }
                : courseId
                  ? { id: { in: touchedBatchIds } }
                  : {}),
            },
            select: {
              id: true,
              name: true,
              capacity: true,
              _count: {
                select: {
                  enrollments: {
                    where: { status: "ACTIVE", leftAt: null },
                  },
                },
              },
            },
            orderBy: { name: "asc" },
          });

    const admissionsById = new Map(
      admissions.map((admission) => [admission.id, admission])
    );
    const admissionsByStudentId = new Map<string, typeof admissions>();
    for (const admission of admissions) {
      if (!admission.studentId) continue;
      const rows = admissionsByStudentId.get(admission.studentId) || [];
      rows.push(admission);
      admissionsByStudentId.set(admission.studentId, rows);
    }
    const attentionBase = (
      admission: (typeof admissions)[number],
      meta: string | null,
      count = 1
    ) => ({
      id: admission.id,
      label:
        admission.student?.user?.name ||
        admission.studentName ||
        admission.admissionNo ||
        "Unknown student",
      meta,
      count,
    });

    const pendingFeesByAdmission = new Map<
      string,
      { count: number; due: number; nextDueDate: Date | null }
    >();
    for (const fee of pendingFees) {
      const relatedAdmissions = fee.admissionId
        ? [admissionsById.get(fee.admissionId)].filter(
            (admission): admission is (typeof admissions)[number] => !!admission
          )
        : fee.studentId
          ? admissionsByStudentId.get(fee.studentId) || []
          : [];
      for (const admission of relatedAdmissions) {
        const aggregate = pendingFeesByAdmission.get(admission.id) || {
          count: 0,
          due: 0,
          nextDueDate: null,
        };
        aggregate.count += 1;
        aggregate.due += Number(fee.dueAmount);
        if (
          !aggregate.nextDueDate ||
          fee.dueDate < aggregate.nextDueDate
        ) {
          aggregate.nextDueDate = fee.dueDate;
        }
        pendingFeesByAdmission.set(admission.id, aggregate);
      }
    }

    const documentsByAdmission = new Map<
      string,
      { count: number; names: Set<string> }
    >();
    for (const document of documents) {
      const relatedAdmissions =
        document.entityType === "ADMISSION"
          ? [admissionsById.get(document.entityId)].filter(
              (admission): admission is (typeof admissions)[number] =>
                !!admission
            )
          : admissionsByStudentId.get(document.entityId) || [];
      for (const admission of relatedAdmissions) {
        const aggregate = documentsByAdmission.get(admission.id) || {
          count: 0,
          names: new Set<string>(),
        };
        aggregate.count += 1;
        aggregate.names.add(document.name);
        documentsByAdmission.set(admission.id, aggregate);
      }
    }

    return {
      summary: {
        totalAdmissions,
        confirmedAdmissions,
        provisionalAdmissions,
        cancelledAdmissions,
        conversionRate:
          totalAdmissions > 0
            ? Math.round((confirmedAdmissions / totalAdmissions) * 100)
            : 0,
      },
      monthlyTrend,
      yearlyTrend,
      courseBreakdown: Array.from(courseMap.entries()).map(
        ([courseName, count]) => ({ courseName, count })
      ),
      branchBreakdown: Array.from(branchMap.entries()).map(
        ([branchName, count]) => ({ branchName, count })
      ),
      counsellorBreakdown: Array.from(counsellorMap.values()).map(
        (item) => ({
          name: item.name,
          count: item.count,
          ...(item.id ? { counsellorId: item.id } : {}),
          counsellorName: item.name,
        })
      ),
      leadSourceBreakdown: Array.from(leadSourceMap.entries()).map(
        ([source, count]) => ({
          name: source,
          source,
          leadSource: source,
          count,
        })
      ),
      batchBreakdown: batches.map((batch) => ({
        batchId: batch.id,
        batchName: batch.name,
        capacity: batch.capacity,
        occupied: batch._count.enrollments,
        available: Math.max(0, batch.capacity - batch._count.enrollments),
        count: batchAdmissionMap.get(batch.id) || 0,
      })),
      funnel: [
        { stage: "Leads", count: filteredLeads.length },
        {
          stage: "Qualified",
          count: filteredLeads.filter(
            (lead) =>
              lead.stage === "INTERESTED" || lead.stage === "FOLLOW_UP"
          ).length,
        },
        { stage: "Application", count: filteredApplications.length },
        {
          stage: "Admission",
          count: admissions.filter(
            (admission) => admission.status !== "CANCELLED"
          ).length,
        },
        { stage: "Confirmed", count: confirmedAdmissions },
      ],
      recentAdmissions: admissions.slice(0, 50).map((admission) => {
        const courses = admission.student?.admissions
          .map((studentAdmission) => studentAdmission.course)
          .filter(
            (
              studentCourse
            ): studentCourse is NonNullable<typeof studentCourse> =>
              !!studentCourse
          );
        const uniqueCourses = Array.from(
          new Map(
            (courses?.length ? courses : [admission.course]).map((course) => [
              course.id,
              course,
            ])
          ).values()
        );
        return {
          id: admission.id,
          admissionNo: admission.admissionNo || "",
          ...(admission.studentId
            ? { studentId: admission.studentId }
            : {}),
          studentName:
            admission.student?.user?.name ||
            admission.studentName ||
            "Unknown",
          courseName: admission.course?.name || "Unassigned",
          courses: uniqueCourses.map((course) => ({
            id: course.id,
            name: course.name,
            ...(course.code ? { code: course.code } : {}),
          })),
          branchName: admission.branch?.name || "Unknown",
          batchName: admission.batch?.name || null,
          counsellorName: getCounsellor(admission).name || null,
          leadSource: getLeadSource(admission),
          status: admission.status,
          admissionDate: admission.admissionDate,
          createdAt: admission.createdAt,
        };
      }),
      needsAttention: {
        provisional: admissions
          .filter(
            (admission) =>
              admission.status === "PROVISIONAL" ||
              admission.status === "PENDING"
          )
          .map((admission) =>
            attentionBase(
              admission,
              `${admission.admissionNo || "No admission number"} · ${admission.status}`
            )
          ),
        pendingFees: Array.from(pendingFeesByAdmission.entries()).map(
          ([admissionId, aggregate]) => {
            const admission = admissionsById.get(admissionId)!;
            return attentionBase(
              admission,
              `₹${aggregate.due.toFixed(2)} due${
                aggregate.nextDueDate
                  ? ` · ${aggregate.nextDueDate.toISOString().slice(0, 10)}`
                  : ""
              }`,
              aggregate.count
            );
          }
        ),
        missingDocuments: Array.from(documentsByAdmission.entries()).map(
          ([admissionId, aggregate]) => {
            const admission = admissionsById.get(admissionId)!;
            return attentionBase(
              admission,
              Array.from(aggregate.names).join(", "),
              aggregate.count
            );
          }
        ),
        unallocatedBatches: admissions
          .filter((admission) => !admission.batchId)
          .map((admission) =>
            attentionBase(
              admission,
              `${admission.admissionNo || "No admission number"} · ${admission.course?.name || "Unassigned course"}`
            )
          ),
      },
    };
  }


  static async getAttendanceReportData(
    instituteId: string,
    filters: import("./report.types").AttendanceReportFilters = {}
  ): Promise<import("./report.types").AttendanceReportResponse> {
    const {
      branchId,
      branchIds,
      dateFrom,
      dateTo,
      courseId,
      batchId,
      facultyId,
      sessionType,
    } = filters;

    const branchFilter = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : {};

    const scheduledDateFilter =
      dateFrom || dateTo
        ? {
            scheduledDate: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {};

    const sessionWhere = {
      ...branchFilter,
      ...scheduledDateFilter,
      ...(batchId ? { batchId } : {}),
      ...(facultyId ? { facultyId } : {}),
      ...(sessionType ? { sessionType: sessionType as "THEORY" | "PRACTICAL" } : {}),
      batch: {
        instituteId,
        ...branchFilter,
        ...(courseId ? { courseId } : {}),
        ...(batchId ? { id: batchId } : {}),
      },
    };

    const [sessions, attendances] = await Promise.all([
      prisma.classSession.findMany({
        where: sessionWhere,
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              course: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          faculty: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
          _count: { select: { attendance: true } },
        },
        orderBy: { scheduledDate: "desc" },
      }),
      prisma.studentAttendance.findMany({
        where: { classSession: sessionWhere },
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              branchId: true,
              branch: { select: { name: true } },
              user: { select: { name: true } },
              batchEnrollments: {
                where: { status: "ACTIVE" },
                take: 1,
                include: {
                  batch: {
                    select: {
                      name: true,
                      course: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          classSession: {
            select: {
              id: true,
              scheduledDate: true,
              sessionType: true,
              batchId: true,
              facultyId: true,
              batch: {
                select: {
                  name: true,
                  course: { select: { name: true } },
                  branch: { select: { name: true } },
                },
              },
              faculty: {
                select: { user: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

    const presentCount = attendances.filter((a) => a.status === "PRESENT").length;
    const absentCount = attendances.filter((a) => a.status === "ABSENT").length;
    const leaveCount = attendances.filter((a) => a.status === "LEAVE").length;
    const totalRecords = attendances.length;
    const avgAttendanceRate =
      totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const totalSessions = sessions.length;

    const statusDistribution = [
      { status: "Present", count: presentCount, color: "#10b981" },
      { status: "Absent", count: absentCount, color: "#ef4444" },
      { status: "Leave", count: leaveCount, color: "#f59e0b" },
    ];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrend: Array<{ month: string; attendanceRate: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const inMonth = attendances.filter((a) => {
        const dt = new Date(a.classSession.scheduledDate);
        return dt >= startOfMonth && dt <= endOfMonth;
      });
      const presentInMonth = inMonth.filter((a) => a.status === "PRESENT").length;
      monthlyTrend.push({
        month: mLabel,
        attendanceRate:
          inMonth.length > 0 ? Math.round((presentInMonth / inMonth.length) * 100) : 0,
      });
    }

    type Agg = { present: number; total: number; sessions: Set<string> };
    const branchStats = new Map<string, Agg>();
    const courseStats = new Map<string, Agg>();
    const batchStats = new Map<string, Agg>();
    const facultyStats = new Map<string, Agg>();

    const bump = (map: Map<string, Agg>, key: string, sessionId: string, isPresent: boolean) => {
      if (!map.has(key)) map.set(key, { present: 0, total: 0, sessions: new Set() });
      const row = map.get(key)!;
      row.total += 1;
      if (isPresent) row.present += 1;
      row.sessions.add(sessionId);
    };

    for (const a of attendances) {
      const isPresent = a.status === "PRESENT";
      const branchName = a.classSession.batch?.branch?.name || "Unknown";
      const courseName = a.classSession.batch?.course?.name || "Unassigned";
      const batchName = a.classSession.batch?.name || "Unassigned";
      const facultyName = a.classSession.faculty?.user?.name || "Unassigned";
      bump(branchStats, branchName, a.classSessionId, isPresent);
      bump(courseStats, courseName, a.classSessionId, isPresent);
      bump(batchStats, batchName, a.classSessionId, isPresent);
      bump(facultyStats, facultyName, a.classSessionId, isPresent);
    }

    const toRateBreakdown = (map: Map<string, Agg>) =>
      Array.from(map.entries()).map(([name, data]) => ({
        name,
        attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        sessions: data.sessions.size,
        presentCount: data.present,
        absentCount: data.total - data.present,
      }));

    const studentAgg = new Map<
      string,
      {
        id: string;
        studentCode: string;
        name: string;
        branchName: string;
        courseName: string;
        batchName: string;
        present: number;
        absent: number;
        leave: number;
        total: number;
        theoryStatuses: Array<{ date: number; status: string }>;
      }
    >();

    for (const a of attendances) {
      const student = a.student;
      if (!student) continue;
      if (!studentAgg.has(student.id)) {
        const enrollment = student.batchEnrollments?.[0];
        studentAgg.set(student.id, {
          id: student.id,
          studentCode: student.studentCode,
          name: student.user?.name || student.studentCode,
          branchName: student.branch?.name || a.classSession.batch?.branch?.name || "—",
          courseName:
            enrollment?.batch?.course?.name ||
            a.classSession.batch?.course?.name ||
            "—",
          batchName: enrollment?.batch?.name || a.classSession.batch?.name || "—",
          present: 0,
          absent: 0,
          leave: 0,
          total: 0,
          theoryStatuses: [],
        });
      }
      const row = studentAgg.get(student.id)!;
      row.total += 1;
      if (a.status === "PRESENT") row.present += 1;
      else if (a.status === "ABSENT") row.absent += 1;
      else if (a.status === "LEAVE") row.leave += 1;
      if (a.classSession.sessionType === "THEORY") {
        row.theoryStatuses.push({
          date: new Date(a.classSession.scheduledDate).getTime(),
          status: a.status,
        });
      }
    }

    const studentIdsForReport = Array.from(studentAgg.keys());
    const { computeStudentAttendanceSummaries } = await import(
      "../attendance/attendance-stats.util"
    );
    const conductedByStudent = await computeStudentAttendanceSummaries(studentIdsForReport);

    const students = Array.from(studentAgg.values()).map((s) => {
      const conducted = conductedByStudent.get(s.id);
      const presentCount = conducted?.presentCount ?? s.present;
      const absentCount = conducted?.absentCount ?? s.absent;
      const leaveCount = conducted?.leaveCount ?? s.leave;
      const totalRecords = conducted?.conductedCount ?? s.total;
      const attendancePercentage = conducted
        ? conducted.attendancePercentage
        : s.total > 0
          ? Math.round((s.present / s.total) * 100)
          : 0;
      const sortedTheory = [...s.theoryStatuses].sort((a, b) => b.date - a.date);
      let consecutiveTheoryAbsences = 0;
      for (const record of sortedTheory) {
        if (record.status === "LEAVE") continue;
        if (record.status === "ABSENT") {
          consecutiveTheoryAbsences += 1;
          continue;
        }
        break;
      }
      let riskFlag: "Normal" | "At Risk" | "Triggered" = "Normal";
      if (consecutiveTheoryAbsences >= 3 || (attendancePercentage < 50 && totalRecords > 0)) {
        riskFlag = "Triggered";
      } else if (consecutiveTheoryAbsences >= 2 || (attendancePercentage < 75 && totalRecords > 0)) {
        riskFlag = "At Risk";
      }
      return {
        id: s.id,
        studentCode: s.studentCode,
        name: s.name,
        branchName: s.branchName,
        courseName: s.courseName,
        batchName: s.batchName,
        attendancePercentage,
        presentCount,
        absentCount,
        leaveCount,
        totalRecords,
        consecutiveTheoryAbsences,
        riskFlag,
      };
    });

    students.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    const atRiskStudents = students.filter((s) => s.riskFlag !== "Normal").length;
    const discontinuationRiskCount = students.filter(
      (s) => s.consecutiveTheoryAbsences >= 3
    ).length;

    const consecutiveAbsences = students
      .filter((s) => s.consecutiveTheoryAbsences >= 2)
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        label: `${s.name} (${s.studentCode})`,
        meta: `${s.consecutiveTheoryAbsences} consecutive theory absences · ${s.batchName}`,
        count: s.consecutiveTheoryAbsences,
      }));

    const lowAttendance = students
      .filter((s) => s.totalRecords > 0 && s.attendancePercentage < 75)
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        label: `${s.name} (${s.studentCode})`,
        meta: `${s.attendancePercentage}% attendance · ${s.batchName}`,
        count: s.absentCount,
      }));

    const unmarkedSessions = sessions
      .filter(
        (s) =>
          s._count.attendance === 0 &&
          (s.sessionStatus === "COMPLETED" || s.sessionStatus === "LIVE")
      )
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        label: s.title || s.batch?.name || "Class session",
        meta: `${s.batch?.name || "—"} · ${new Date(s.scheduledDate).toLocaleDateString("en-IN")} · ${s.faculty?.user?.name || "—"}`,
        count: 0,
      }));

    const branchBreakdown = Array.from(branchStats.entries()).map(([branchName, data]) => ({
      branchName,
      attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      sessions: data.sessions.size,
      presentCount: data.present,
      absentCount: data.total - data.present,
    }));

    return {
      summary: {
        totalSessions,
        avgAttendanceRate,
        presentCount,
        absentCount,
        leaveCount,
        atRiskStudents,
        discontinuationRiskCount,
      },
      statusDistribution,
      monthlyTrend,
      branchBreakdown,
      courseBreakdown: toRateBreakdown(courseStats).map((r) => ({
        courseName: r.name,
        attendanceRate: r.attendanceRate,
        sessions: r.sessions,
      })),
      batchBreakdown: toRateBreakdown(batchStats).map((r) => ({
        batchName: r.name,
        attendanceRate: r.attendanceRate,
        sessions: r.sessions,
      })),
      facultyBreakdown: toRateBreakdown(facultyStats).map((r) => ({
        facultyName: r.name,
        attendanceRate: r.attendanceRate,
        sessions: r.sessions,
      })),
      students: students.slice(0, 100),
      needsAttention: {
        consecutiveAbsences,
        lowAttendance,
        unmarkedSessions,
      },
    };
  }

  static async getExaminationsReportData(
    instituteId: string,
    filters: import("./report.types").ExaminationsReportFilters = {}
  ): Promise<import("./report.types").ExaminationsReportResponse> {
    const { branchId, branchIds, status, courseId, dateFrom, dateTo } = filters;

    const branchClause = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : null;

    const studentBranchClause = branchId
      ? { branchId }
      : branchIds?.length
        ? { branchId: { in: branchIds } }
        : null;

    const examBranchFilter = branchClause
      ? {
          OR: [
            branchClause,
            {
              branchId: null,
              batchAssignments: {
                some: { batch: branchClause },
              },
            },
          ],
        }
      : {};

    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.startAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const attemptStatuses = [
      "COMPLETED",
      "EVALUATING",
      "SUBMITTED",
      "AUTO_SUBMITTED",
      "TERMINATED",
    ] as const;

    const exams = await prisma.exam.findMany({
      where: {
        instituteId,
        ...examBranchFilter,
        ...(status
          ? { status: status as any }
          : { status: { notIn: ["ARCHIVED", "CANCELLED"] } }),
        ...(courseId ? { courseId } : {}),
        ...dateFilter,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        attempts: {
          where: {
            status: { in: [...attemptStatuses] },
            ...(studentBranchClause ? { student: studentBranchClause } : {}),
          },
          orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
          select: {
            id: true,
            status: true,
            attemptNumber: true,
            score: true,
            totalMarks: true,
            percentage: true,
            passed: true,
            submittedAt: true,
            startedAt: true,
            student: {
              select: {
                id: true,
                studentCode: true,
                branch: { select: { name: true } },
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
    });

    const attemptPct = (a: {
      percentage: number | null;
      score: number | null;
      totalMarks: number | null;
    }) => {
      if (a.percentage != null && Number.isFinite(a.percentage)) return a.percentage;
      if (a.score != null && a.totalMarks && a.totalMarks > 0) {
        return (a.score / a.totalMarks) * 100;
      }
      return null;
    };

    const totalExams = exams.length;
    const publishedExams = exams.filter((e) =>
      ["PUBLISHED", "SCHEDULED", "LIVE", "ENDED", "COMPLETED"].includes(e.status)
    ).length;

    const completedAttempts = exams.flatMap((e) =>
      e.attempts.filter((a) => a.status === "COMPLETED")
    );
    const totalAttempts = completedAttempts.length;
    const scored = completedAttempts
      .map((a) => attemptPct(a))
      .filter((v): v is number => v != null);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, v) => sum + v, 0) / scored.length)
        : 0;
    const passedCount = completedAttempts.filter((a) => a.passed === true).length;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

    const scoreBuckets = { "90-100": 0, "75-89": 0, "50-74": 0, "Below 50": 0 };
    for (const pct of scored) {
      if (pct >= 90) scoreBuckets["90-100"] += 1;
      else if (pct >= 75) scoreBuckets["75-89"] += 1;
      else if (pct >= 50) scoreBuckets["50-74"] += 1;
      else scoreBuckets["Below 50"] += 1;
    }

    const examBreakdown = exams.map((e) => {
      const completed = e.attempts.filter((a) => a.status === "COMPLETED");
      const attempts = completed.length;
      const examScores = completed
        .map((a) => attemptPct(a))
        .filter((v): v is number => v != null);
      const avg =
        examScores.length > 0
          ? Math.round(examScores.reduce((sum, v) => sum + v, 0) / examScores.length)
          : 0;
      const passed = completed.filter((a) => a.passed === true).length;
      return {
        id: e.id,
        title: e.name,
        status: e.status,
        courseName: e.course?.name || null,
        branchName: e.branch?.name || null,
        attempts,
        avgScore: avg,
        passRate: attempts > 0 ? Math.round((passed / attempts) * 100) : 0,
        startAt: e.startAt ? e.startAt.toISOString() : null,
      };
    });

    const courseMap = new Map<
      string,
      { courseName: string; exams: number; attempts: number; scoreSum: number; scoreN: number; passed: number }
    >();
    for (const e of exams) {
      const key = e.course?.id || "__none__";
      const name = e.course?.name || "Unassigned Course";
      const row = courseMap.get(key) || {
        courseName: name,
        exams: 0,
        attempts: 0,
        scoreSum: 0,
        scoreN: 0,
        passed: 0,
      };
      row.exams += 1;
      const completed = e.attempts.filter((a) => a.status === "COMPLETED");
      row.attempts += completed.length;
      for (const a of completed) {
        const pct = attemptPct(a);
        if (pct != null) {
          row.scoreSum += pct;
          row.scoreN += 1;
        }
        if (a.passed === true) row.passed += 1;
      }
      courseMap.set(key, row);
    }
    const courseBreakdown = Array.from(courseMap.values())
      .map((c) => ({
        courseName: c.courseName,
        exams: c.exams,
        attempts: c.attempts,
        avgScore: c.scoreN > 0 ? Math.round(c.scoreSum / c.scoreN) : 0,
        passRate: c.attempts > 0 ? Math.round((c.passed / c.attempts) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts || b.exams - a.exams);

    const studentResults = exams.flatMap((e) =>
      e.attempts
        .filter((a) => a.status === "COMPLETED")
        .map((a) => ({
          attemptId: a.id,
          examId: e.id,
          examName: e.name,
          studentId: a.student.id,
          studentName: a.student.user?.name || "Unknown Student",
          studentCode: a.student.studentCode,
          email: a.student.user?.email || null,
          branchName: a.student.branch?.name || null,
          attemptNumber: a.attemptNumber,
          status: a.status,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: attemptPct(a),
          passed: a.passed,
          submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
          startedAt: a.startedAt ? a.startedAt.toISOString() : null,
        }))
    );

    const lowPassRate = examBreakdown
      .filter((e) => e.attempts >= 3 && e.passRate < 50)
      .map((e) => ({
        id: e.id,
        label: e.title,
        meta: `${e.passRate}% pass · ${e.attempts} attempts${e.courseName ? ` · ${e.courseName}` : ""}`,
        count: e.attempts,
      }));

    const zeroAttempts = examBreakdown
      .filter(
        (e) =>
          e.attempts === 0 &&
          ["PUBLISHED", "SCHEDULED", "LIVE", "ENDED", "COMPLETED"].includes(e.status)
      )
      .map((e) => ({
        id: e.id,
        label: e.title,
        meta: `${e.status}${e.courseName ? ` · ${e.courseName}` : ""}`,
        count: 0,
      }));

    const pendingByExam = new Map<string, { title: string; count: number; courseName: string | null }>();
    for (const e of exams) {
      const pending = e.attempts.filter((a) =>
        ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATING"].includes(a.status)
      ).length;
      if (pending > 0) {
        pendingByExam.set(e.id, {
          title: e.name,
          count: pending,
          courseName: e.course?.name || null,
        });
      }
    }
    const pendingEvaluation = Array.from(pendingByExam.entries()).map(([id, row]) => ({
      id,
      label: row.title,
      meta: `${row.count} pending evaluation${row.courseName ? ` · ${row.courseName}` : ""}`,
      count: row.count,
    }));

    const courseOptions = new Map<string, { id: string; name: string; code?: string }>();
    for (const e of exams) {
      if (e.course) {
        courseOptions.set(e.course.id, {
          id: e.course.id,
          name: e.course.name,
          code: e.course.code,
        });
      }
    }

    // When course filter is applied, still expose other courses for the dropdown via a light query
    if (courseId || status || dateFrom || dateTo) {
      const optionExams = await prisma.exam.findMany({
        where: {
          instituteId,
          ...examBranchFilter,
          status: { notIn: ["ARCHIVED", "CANCELLED"] },
          courseId: { not: null },
        },
        select: { course: { select: { id: true, name: true, code: true } } },
        distinct: ["courseId"],
      });
      for (const row of optionExams) {
        if (row.course) {
          courseOptions.set(row.course.id, {
            id: row.course.id,
            name: row.course.name,
            code: row.course.code,
          });
        }
      }
    }

    return {
      summary: {
        totalExams,
        publishedExams,
        totalAttempts,
        avgScore,
        passRate,
      },
      examBreakdown,
      scoreDistribution: Object.entries(scoreBuckets).map(([range, count]) => ({ range, count })),
      courseBreakdown,
      studentResults,
      needsAttention: {
        lowPassRate,
        zeroAttempts,
        pendingEvaluation,
      },
      filterOptions: {
        courses: Array.from(courseOptions.values()).sort((a, b) => a.name.localeCompare(b.name)),
      },
    };
  }
}
